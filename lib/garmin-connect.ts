// Unofficial Garmin Connect API — authenticates with email/password via Garmin SSO
// No consumer key required. Uses the same auth flow as the Garmin Connect mobile app.

import { dbGet, dbRun } from "./db";

const UA = "Mozilla/5.0 (Linux; Android 12; Samsung) AppleWebKit/537.36";
const CONNECT = "https://connect.garmin.com";

const SSO_PARAMS = new URLSearchParams({
  id: "gauth-widget",
  embedWidget: "true",
  gauthHost: "https://sso.garmin.com/sso",
  service: `${CONNECT}/modern/`,
  source: `${CONNECT}/signin/`,
  redirectAfterAccountLoginUrl: `${CONNECT}/modern/`,
  redirectAfterAccountCreationUrl: `${CONNECT}/modern/`,
  clientId: "GarminConnect",
  rememberMeShown: "true",
  rememberMeChecked: "false",
  createAccountShown: "true",
  generateExtraServiceTicket: "true",
  generateTwoExtraServiceTickets: "false",
  generateNoServiceTicket: "false",
});
const SSO_URL = `https://sso.garmin.com/sso/embed?${SSO_PARAMS}`;

function parseCookies(headers: Headers): string {
  const raw: string[] =
    typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : (headers.get("set-cookie") ?? "").split(",").filter(Boolean);
  return raw.map((c) => c.split(";")[0].trim()).join("; ");
}

export async function garminConnectLogin(
  email: string,
  password: string
): Promise<{ session: string; displayName: string } | { error: string }> {
  // 1. Fetch login page for CSRF token
  const pageRes = await fetch(SSO_URL, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!pageRes.ok) return { error: "Could not reach Garmin SSO" };

  const pageCookies = parseCookies(pageRes.headers);
  const html = await pageRes.text();
  const csrf =
    html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1] ??
    html.match(/"_csrf"\s*value="([^"]+)"/)?.[1];
  if (!csrf) return { error: "Could not extract CSRF token from Garmin login page" };

  // 2. Submit credentials
  const loginRes = await fetch(SSO_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer: SSO_URL,
      Cookie: pageCookies,
    },
    body: new URLSearchParams({
      username: email,
      password,
      embed: "true",
      _csrf: csrf,
    }).toString(),
  });

  // 3. Extract service ticket from redirect or response body
  let ticket: string | null = null;
  const location = loginRes.headers.get("location") ?? "";
  ticket = location.match(/ticket=(ST-[^\s&"]+)/)?.[1] ?? null;

  if (!ticket) {
    const body = await loginRes.text();
    if (body.toLowerCase().includes("invalid username or password") ||
        body.toLowerCase().includes("login failed")) {
      return { error: "Falsches Passwort oder Email" };
    }
    if (body.toLowerCase().includes("mfa") || body.toLowerCase().includes("two-factor")) {
      return { error: "Dein Garmin-Konto hat 2-Faktor-Authentifizierung aktiviert. Bitte deaktiviere sie vorübergehend in Garmin Connect → Einstellungen → Konto → Sicherheit." };
    }
    ticket = body.match(/ticket=(ST-[^\s&"<]+)/)?.[1] ?? null;
  }

  if (!ticket) return { error: "Login fehlgeschlagen — kein Service Ticket erhalten" };

  // 4. Exchange ticket for session cookies
  const sessionRes = await fetch(`${CONNECT}/modern/?ticket=${ticket}`, {
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  const session = parseCookies(sessionRes.headers);
  if (!session) return { error: "Keine Session-Cookies erhalten" };

  // 5. Get user display name from profile
  const profileRes = await fetch(
    `${CONNECT}/modern/proxy/userprofile-service/socialProfile`,
    { headers: { Cookie: session, "User-Agent": UA, NK: "NT" } }
  );
  const profile = profileRes.ok ? await profileRes.json() : {};
  const displayName: string = profile.displayName ?? profile.userName ?? email.split("@")[0];

  return { session, displayName };
}

// Loads stored session from DB
export async function getGarminSession(): Promise<{ session: string; displayName: string } | null> {
  const row = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'garmin_connect_session'");
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

async function connectGet(path: string, session: string) {
  const res = await fetch(`${CONNECT}/modern/proxy${path}`, {
    headers: { Cookie: session, "User-Agent": UA, NK: "NT", "X-app-ver": "4.80.0.0" },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchConnectSleep(date: string, displayName: string, session: string) {
  const data = await connectGet(
    `/wellness-service/wellness/dailySleepData/${displayName}?date=${date}&nonSleepBufferMinutes=60`,
    session
  );
  return data?.dailySleepDTO ?? null;
}

export async function fetchConnectHRV(date: string, session: string) {
  const data = await connectGet(`/hrv-service/hrv/${date}`, session);
  return data?.hrvSummary ?? null;
}

export async function fetchConnectDaily(date: string, displayName: string, session: string) {
  return connectGet(
    `/usersummary-service/usersummary/daily/${displayName}?calendarDate=${date}`,
    session
  );
}

export async function saveGarminSession(session: string, displayName: string) {
  await dbRun(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('garmin_connect_session', ?, unixepoch())",
    [JSON.stringify({ session, displayName })]
  );
}
