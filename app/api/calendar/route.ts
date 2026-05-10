import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";

export async function GET(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const date = searchParams.get("date");

  if (date) {
    const events = await dbAll(
      "SELECT * FROM calendar_events WHERE date = ? OR (date <= ? AND end_date >= ?) ORDER BY time ASC",
      [date, date, date]
    );
    return NextResponse.json({ events });
  }

  if (month) {
    const events = await dbAll(
      "SELECT * FROM calendar_events WHERE date LIKE ? OR end_date LIKE ? ORDER BY date ASC, time ASC",
      [`${month}%`, `${month}%`]
    );
    return NextResponse.json({ events });
  }

  const events = await dbAll("SELECT * FROM calendar_events ORDER BY date ASC, time ASC LIMIT 50");
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();
  const { title, date, end_date, time, end_time, type, notes, goal_id, recurring } = body;

  const r = await dbRun(
    "INSERT INTO calendar_events (title, date, end_date, time, end_time, type, notes, goal_id, recurring) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [title, date, end_date ?? null, time ?? null, end_time ?? null, type ?? "personal", notes ?? null, goal_id ?? null, recurring ?? null]
  );
  const event = await dbGet("SELECT * FROM calendar_events WHERE id = ?", [r.lastInsertRowid]);
  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await dbRun("DELETE FROM calendar_events WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
