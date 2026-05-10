import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const days = parseInt(searchParams.get("days") ?? "7");

  if (date) {
    const row = db.prepare("SELECT * FROM health_data WHERE date = ?").get(date);
    return NextResponse.json({ data: row ?? null });
  }

  const rows = db.prepare(
    "SELECT * FROM health_data ORDER BY date DESC LIMIT ?"
  ).all(days);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const date = body.date ?? todayStr();

  const existing = db.prepare("SELECT id FROM health_data WHERE date = ?").get(date) as { id: number } | undefined;

  const fields = [
    "sleep_start", "sleep_end", "sleep_duration_min", "sleep_score",
    "deep_sleep_min", "light_sleep_min", "rem_sleep_min", "awake_min",
    "hrv_avg", "hrv_overnight_avg", "resting_hr", "respiratory_rate",
    "body_battery_start", "body_battery_end", "stress_avg",
    "steps", "active_calories", "total_calories", "floors", "spo2_avg", "source"
  ];

  if (existing) {
    const updates = fields.filter(f => body[f] !== undefined).map(f => `${f} = ?`);
    const values = fields.filter(f => body[f] !== undefined).map(f => body[f]);
    if (updates.length > 0) {
      db.prepare(`UPDATE health_data SET ${updates.join(", ")} WHERE date = ?`).run(...values, date);
    }
  } else {
    const cols = ["date", ...fields.filter(f => body[f] !== undefined)];
    const vals = [date, ...fields.filter(f => body[f] !== undefined).map(f => body[f])];
    db.prepare(`INSERT INTO health_data (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).run(...vals);
  }

  const row = db.prepare("SELECT * FROM health_data WHERE date = ?").get(date);
  return NextResponse.json({ data: row });
}
