import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const date = searchParams.get("date");

  if (date) {
    const events = db.prepare("SELECT * FROM calendar_events WHERE date = ? OR (date <= ? AND end_date >= ?) ORDER BY time ASC").all(date, date, date);
    return NextResponse.json({ events });
  }

  if (month) {
    const events = db.prepare(
      "SELECT * FROM calendar_events WHERE date LIKE ? OR end_date LIKE ? ORDER BY date ASC, time ASC"
    ).all(`${month}%`, `${month}%`);
    return NextResponse.json({ events });
  }

  const events = db.prepare("SELECT * FROM calendar_events ORDER BY date ASC, time ASC LIMIT 50").all();
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { title, date, end_date, time, end_time, type, notes, goal_id, recurring } = body;

  const result = db.prepare(
    "INSERT INTO calendar_events (title, date, end_date, time, end_time, type, notes, goal_id, recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(title, date, end_date ?? null, time ?? null, end_time ?? null, type ?? "personal", notes ?? null, goal_id ?? null, recurring ?? null);

  const event = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
