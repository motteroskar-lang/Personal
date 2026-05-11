import { NextResponse } from "next/server";
import { dbGet, initSchema } from "@/lib/db";

export async function GET() {
  const checks: Record<string, boolean | string> = {
    turso_url: !!process.env.TURSO_DATABASE_URL,
    turso_token: !!process.env.TURSO_AUTH_TOKEN,
    anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    google_client: !!process.env.GOOGLE_CLIENT_ID,
  };

  try {
    await initSchema();
    const row = await dbGet<{ n: number }>("SELECT 1 as n");
    checks.db_connection = row?.n === 1 ? true : "query failed";
  } catch (err) {
    checks.db_connection = String(err);
  }

  const allOk = checks.turso_url && checks.turso_token && checks.db_connection === true;
  return NextResponse.json({ ok: allOk, checks }, { status: allOk ? 200 : 500 });
}
