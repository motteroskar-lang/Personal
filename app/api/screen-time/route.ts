import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  const rows = db.prepare("SELECT * FROM screen_time ORDER BY date DESC LIMIT ?").all(days);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const {
    date, total_minutes, social_media_min, productivity_min,
    entertainment_min, health_fitness_min, app_breakdown
  } = body;

  const d = date ?? todayStr();
  const existing = db.prepare("SELECT id FROM screen_time WHERE date = ?").get(d);

  if (existing) {
    db.prepare(`
      UPDATE screen_time SET total_minutes = ?, social_media_min = ?, productivity_min = ?,
      entertainment_min = ?, health_fitness_min = ?, app_breakdown = ? WHERE date = ?
    `).run(
      total_minutes ?? 0, social_media_min ?? 0, productivity_min ?? 0,
      entertainment_min ?? 0, health_fitness_min ?? 0,
      app_breakdown ? JSON.stringify(app_breakdown) : null, d
    );
  } else {
    db.prepare(`
      INSERT INTO screen_time (date, total_minutes, social_media_min, productivity_min, entertainment_min, health_fitness_min, app_breakdown)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      d, total_minutes ?? 0, social_media_min ?? 0, productivity_min ?? 0,
      entertainment_min ?? 0, health_fitness_min ?? 0,
      app_breakdown ? JSON.stringify(app_breakdown) : null
    );
  }

  const row = db.prepare("SELECT * FROM screen_time WHERE date = ?").get(d);
  return NextResponse.json({ data: row });
}
