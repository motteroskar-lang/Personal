import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const settings: Record<string, unknown> = {};

  for (const row of rows) {
    // Don't expose tokens
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

  // Check which integrations are connected
  const garminConnected = !!db.prepare("SELECT 1 FROM settings WHERE key = 'garmin_tokens'").get();
  const revoltConnected = !!db.prepare("SELECT 1 FROM settings WHERE key = 'revolut_token'").get();

  return NextResponse.json({ settings, integrations: { garmin: garminConnected, revolut: revoltConnected } });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch())")
      .run(key, typeof value === "string" ? value : JSON.stringify(value));
  }

  return NextResponse.json({ ok: true });
}
