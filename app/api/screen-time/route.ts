import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  const rows = await dbAll("SELECT * FROM screen_time ORDER BY date DESC LIMIT ?", [days]);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();
  const {
    date, total_minutes, social_media_min, productivity_min,
    entertainment_min, health_fitness_min, app_breakdown
  } = body;

  const d = date ?? todayStr();
  const appBreakdownStr = app_breakdown ? JSON.stringify(app_breakdown) : null;
  const existing = await dbGet<{ id: number }>("SELECT id FROM screen_time WHERE date = ?", [d]);

  if (existing) {
    await dbRun(
      `UPDATE screen_time SET total_minutes = ?, social_media_min = ?, productivity_min = ?,
       entertainment_min = ?, health_fitness_min = ?, app_breakdown = ? WHERE date = ?`,
      [total_minutes ?? 0, social_media_min ?? 0, productivity_min ?? 0,
       entertainment_min ?? 0, health_fitness_min ?? 0, appBreakdownStr, d]
    );
  } else {
    await dbRun(
      `INSERT INTO screen_time (date, total_minutes, social_media_min, productivity_min, entertainment_min, health_fitness_min, app_breakdown)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d, total_minutes ?? 0, social_media_min ?? 0, productivity_min ?? 0,
       entertainment_min ?? 0, health_fitness_min ?? 0, appBreakdownStr]
    );
  }

  const row = await dbGet("SELECT * FROM screen_time WHERE date = ?", [d]);
  return NextResponse.json({ data: row });
}
