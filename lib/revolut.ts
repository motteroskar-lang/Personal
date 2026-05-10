// Revolut Open Banking API integration
// Setup: https://developer.revolut.com/docs/business/business-api

export interface RevolutTransaction {
  id: string;
  created_at: string;
  completed_at: string;
  state: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  merchant?: { name: string; category: string };
}

export interface RevolutAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: string;
  type: string;
}

const REVOLUT_BASE = process.env.REVOLUT_ENVIRONMENT === "sandbox"
  ? "https://sandbox-b2b.revolut.com/api/1.0"
  : "https://b2b.revolut.com/api/1.0";

async function getRevolutToken(): Promise<string | null> {
  const { getDb } = await import("./db");
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'revolut_token'").get() as { value: string } | undefined;
  if (!row) return null;
  try {
    const tokenData = JSON.parse(row.value);
    // Refresh if expired
    if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
      return await refreshRevolutToken(tokenData.refresh_token);
    }
    return tokenData.access_token;
  } catch {
    return null;
  }
}

async function refreshRevolutToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${REVOLUT_BASE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.REVOLUT_CLIENT_ID ?? "",
        client_secret: process.env.REVOLUT_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();

    const { getDb } = await import("./db");
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('revolut_token', ?)").run(
      JSON.stringify({ ...data, expires_at: Date.now() + data.expires_in * 1000 })
    );
    return data.access_token;
  } catch {
    return null;
  }
}

export async function fetchRevolutAccounts(): Promise<RevolutAccount[]> {
  const token = await getRevolutToken();
  if (!token) return [];

  try {
    const res = await fetch(`${REVOLUT_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchRevolutTransactions(from: string, to: string): Promise<RevolutTransaction[]> {
  const token = await getRevolutToken();
  if (!token) return [];

  try {
    const res = await fetch(`${REVOLUT_BASE}/transactions?from=${from}&to=${to}&count=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function getRevolutAuthUrl(): string {
  const clientId = process.env.REVOLUT_CLIENT_ID ?? "";
  const callbackUrl = encodeURIComponent(process.env.REVOLUT_CALLBACK_URL ?? "http://localhost:3000/api/revolut/callback");
  return `https://app.revolut.com/app-confirm?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code`;
}

export { SPENDING_CATEGORIES } from "./utils";
