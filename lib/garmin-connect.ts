// Unofficial Garmin Connect API — authenticates with email/password via Garmin SSO.
// Uses Node.js https module for proper redirect + cookie handling (fetch can't do this).

import https from "https";
import { URL } from "url";
import { dbGet, dbRun } from "./db";

const UA = "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const CONNECT = "https://connect.garmin.com";
const SSO_HOST = "https://sso.garmin.com";

const SSO_PARAMS = new URLSearchParams({
  service: `${CONNECT}/modern/`,
  webhost: CONNECT,
  source: `${CONNECT}/signin/`,
  redirectAfterAccountLoginUrl: `${CONNECT}/modern/`,
  gauthHost: "https://sso.garmin.com/sso",
  locale: "en_US",
  id: "gauth-widget",
  clientId: "GarminConnect",
  rememberMeShown: "true",
  rememberMeChecked: "false",
  createAccountShown: "true",
  openCreateAccount: "false",
  consumeServiceTicket: "false",
  embedWidget: "false",
  generateExtraServiceTicket: "true",
  generateNoServiceTicket: "false",
  globalOptInShown: "true",
  globalOptInChecked: "false",
  mobile: "false",
  connectLegalTerms: "true",
  locationPromptShown: "true",
  showPassword: "true",
}).toString();

const SSO_URL = `https://sso.garmin.com/sso/signin?${SSO_PARAMS}`;

// ── Low-level HTTPS request that exposes redirect Location + Set-Cookie ──────

type RawResponse = { status: number; location: string | null; setCookies: string[]; body: string };

async function rawRequest(
  urlStr: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const defaultHeaders: Record<string, string> = {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
      "Connection": "keep-alive",
    };
    const reqOpts: https.RequestOptions = {
      hostname: u.hostname,
      port: u.port ? parseInt(u.port) : 443,
      path: u.pathname + u.search,
      method: opts.method ?? "GET",
      headers: { ...defaultHeaders, ...opts.headers },
    };

    const req = https.request(reqOpts, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 0,
          location: res.headers.location ?? null,
          setCookies: ([] as string[]).concat(res.headers["set-cookie"] ?? []),
          body: Buffer.concat(chunks).toString("utf8"),
        })
      );
    });
    req.setTimeout(8000, () => req.destroy(new Error("Garmin-Server antwortet nicht (Timeout)")));
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ── Cookie jar helper ─────────────────────────────────────────────────────────

function addCookies(jar: Map<string, string>, setCookies: string[]) {
  for (const raw of setCookies) {
    const [kv] = raw.split(";");
    const eq = kv.indexOf("=");
    if (eq > 0) jar.set(kv.slice(0, eq).trim(), kv.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// Follow a redirect chain, accumulating cookies
async function followRedirects(
  startUrl: string,
  jar: Map<string, string>,
  max = 6
): Promise<void> {
  let url: string | null = startUrl;
  let hops = 0;
  while (url && hops < max) {
    const res = await rawRequest(url, { headers: { Cookie: cookieHeader(jar) } });
    addCookies(jar, res.setCookies);
    url = res.location ? resolveUrl(url, res.location) : null;
    hops++;
  }
}

function resolveUrl(base: string, maybeRelative: string): string {
  if (maybeRelative.startsWith("http")) return maybeRelative;
  const b = new URL(base);
  return `${b.protocol}//${b.host}${maybeRelative}`;
}

function extractCsrf(html: string): string | null {
  return (
    html.match(/name=["']_csrf["']\s+value=["']([^"']+)["']/)?.[1] ??
    html.match(/value=["']([^"']+)["']\s+name=["']_csrf["']/)?.[1] ??
    html.match(/"_csrf"\s*:\s*"([^"]+)"/)?.[1] ??
    html.match(/name="_csrf"\s+[^>]*value="([^"]+)"/)?.[1] ??
    html.match(/id="csrf"\s+[^>]*value="([^"]+)"/)?.[1] ??
    html.match(/"csrfToken"\s*:\s*"([^"]+)"/)?.[1] ??
    html.match(/data-csrf=["']([^"']+)["']/)?.[1] ??
    null
  );
}

// ── Public auth function ──────────────────────────────────────────────────────

export async function garminConnectLogin(
  email: string,
  password: string
): Promise<{ session: string; displayName: string } | { error: string }> {
  const jar = new Map<string, string>();

  // Step 1 — GET login page, collect CSRF + cookies
  const page = await rawRequest(SSO_URL, { headers: { Accept: "text/html" } });
  addCookies(jar, page.setCookies);

  const csrf = extractCsrf(page.body);
  if (!csrf) {
    const preview = page.body.slice(0, 120).replace(/\s+/g, " ").trim();
    return {
      error: `Garmin-Login: CSRF nicht gefunden (Status ${page.status}). Seitenanfang: "${preview}"`,
    };
  }

  // Step 2 — POST credentials
  const formBody = new URLSearchParams({
    username: email,
    password,
    embed: "true",
    _csrf: csrf,
  }).toString();

  const login = await rawRequest(SSO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": String(Buffer.byteLength(formBody)),
      "Origin": SSO_HOST,
      "Referer": SSO_URL,
      "Cookie": cookieHeader(jar),
    },
    body: formBody,
  });
  addCookies(jar, login.setCookies);

  // Step 3 — Extract service ticket from redirect
  const location = login.location;
  if (!location) {
    const body = login.body.toLowerCase();
    if (body.includes("invalid") || body.includes("incorrect") || body.includes("falsch"))
      return { error: "Falsche Email oder falsches Passwort." };
    if (body.includes("mfa") || body.includes("two-factor") || body.includes("verification"))
      return { error: "Dein Garmin-Konto hat 2-Faktor-Auth (2FA) aktiviert. Bitte deaktiviere sie kurz in der Garmin Connect App → Profil → Einstellungen → Sicherheit, verbinde dich, dann reaktiviere sie." };
    const preview = login.body.slice(0, 100).replace(/\s+/g, " ").trim();
    return { error: `Login fehlgeschlagen (Status ${login.status}): ${preview || "Keine Antwort"}` };
  }

  const ticket = location.match(/ticket=(ST-[^\s&"]+)/)?.[1];
  if (!ticket) {
    return { error: `Kein Service Ticket in Garmin-Antwort: ${location.slice(0, 80)}` };
  }

  // Step 4 — Exchange ticket for session, following all redirects
  const ticketUrl = resolveUrl(SSO_URL, location);
  await followRedirects(ticketUrl, jar);

  const session = cookieHeader(jar);
  if (!session) return { error: "Keine Session-Cookies erhalten" };

  // Step 5 — Get display name from profile
  let displayName = email.split("@")[0];
  try {
    const profile = await rawRequest(
      `${CONNECT}/modern/proxy/userprofile-service/socialProfile`,
      { headers: { Cookie: session, NK: "NT", "X-app-ver": "4.80.0.0" } }
    );
    const p = JSON.parse(profile.body);
    displayName = p.displayName ?? p.userName ?? displayName;
  } catch { /* use fallback */ }

  return { session, displayName };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getGarminSession(): Promise<{ session: string; displayName: string } | null> {
  const row = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'garmin_connect_session'");
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function saveGarminSession(session: string, displayName: string): Promise<void> {
  await dbRun(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('garmin_connect_session', ?, unixepoch())",
    [JSON.stringify({ session, displayName })]
  );
}

// ── Garmin Connect data endpoints ─────────────────────────────────────────────

async function connectGet(path: string, session: string): Promise<unknown> {
  const res = await rawRequest(`${CONNECT}/modern/proxy${path}`, {
    headers: { Cookie: session, NK: "NT", "X-app-ver": "4.80.0.0" },
  });
  if (res.status !== 200) return null;
  try { return JSON.parse(res.body); } catch { return null; }
}

export async function fetchConnectSleep(date: string, displayName: string, session: string) {
  const d = await connectGet(
    `/wellness-service/wellness/dailySleepData/${displayName}?date=${date}&nonSleepBufferMinutes=60`,
    session
  ) as Record<string, unknown> | null;
  return d?.dailySleepDTO ?? null;
}

export async function fetchConnectHRV(date: string, session: string) {
  const d = await connectGet(`/hrv-service/hrv/${date}`, session) as Record<string, unknown> | null;
  return d?.hrvSummary ?? null;
}

export async function fetchConnectDaily(date: string, displayName: string, session: string) {
  return connectGet(
    `/usersummary-service/usersummary/daily/${displayName}?calendarDate=${date}`,
    session
  ) as Promise<Record<string, unknown> | null>;
}
