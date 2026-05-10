import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun, initSchema } from "@/lib/db";

export async function GET() {
  await initSchema();

  const rows = await dbAll<{ key: string; value: string }>("SELECT key, value FROM settings");
  const settings: Record<string, unknown> = {};

  for (const row of rows) {
    if (row.key.includes("token") || row.key.includes("secret")) {
      settings[row.key] = "***";
      continue;
    }
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  const garminConnected = !!(await dbGet("SELECT 1 FROM settings WHERE key = 'garmin_tokens'"));
  const revoltConnected = !!(await dbGet("SELECT 1 FROM settings WHERE key = 'revolut_token'"));

  return NextResponse.json({ settings, integrations: { garmin: garminConnected, revolut: revoltConnected } });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch())",
      [key, typeof value === "string" ? value : JSON.stringify(value)]
    );
  }

  return NextResponse.json({ ok: true });
}
