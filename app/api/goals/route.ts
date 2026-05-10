import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayStr();
  const type = searchParams.get("type") ?? "long_term";

  if (type === "daily") {
    const tasks = db.prepare("SELECT * FROM daily_tasks WHERE date = ? ORDER BY id ASC").all(date);
    return NextResponse.json({ tasks });
  }

  const goals = db.prepare("SELECT * FROM goals WHERE status = 'active' ORDER BY urgency DESC, deadline ASC").all();
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { type } = body;

  if (type === "daily") {
    const { date, text, goal_id, ai_generated } = body;
    const result = db.prepare(
      "INSERT INTO daily_tasks (date, text, done, queued, goal_id, ai_generated) VALUES (?, ?, 0, 0, ?, ?)"
    ).run(date ?? todayStr(), text, goal_id ?? null, ai_generated ? 1 : 0);
    const task = db.prepare("SELECT * FROM daily_tasks WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ task });
  }

  const { title, description, category, target_value, unit, deadline, urgency } = body;
  const result = db.prepare(
    "INSERT INTO goals (title, description, category, target_value, unit, deadline, urgency) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(title, description ?? null, category ?? "personal", target_value ?? null, unit ?? null, deadline ?? null, urgency ?? "medium");
  const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ goal });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, type } = body;

  if (type === "daily") {
    const { done, queued } = body;
    if (done !== undefined) {
      db.prepare("UPDATE daily_tasks SET done = ? WHERE id = ?").run(done ? 1 : 0, id);
    }
    if (queued !== undefined) {
      db.prepare("UPDATE daily_tasks SET queued = ? WHERE id = ?").run(queued ? 1 : 0, id);
    }
    return NextResponse.json({ ok: true });
  }

  const { current_value, status, urgency, title, description, deadline } = body;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (current_value !== undefined) { updates.push("current_value = ?"); values.push(current_value); }
  if (status !== undefined) { updates.push("status = ?"); values.push(status); }
  if (urgency !== undefined) { updates.push("urgency = ?"); values.push(urgency); }
  if (title !== undefined) { updates.push("title = ?"); values.push(title); }
  if (description !== undefined) { updates.push("description = ?"); values.push(description); }
  if (deadline !== undefined) { updates.push("deadline = ?"); values.push(deadline); }

  if (updates.length > 0) {
    updates.push("updated_at = unixepoch()");
    values.push(id);
    db.prepare(`UPDATE goals SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(id);
  return NextResponse.json({ goal });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "long_term";

  if (type === "daily") {
    db.prepare("DELETE FROM daily_tasks WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM goals WHERE id = ?").run(id);
  }
  return NextResponse.json({ ok: true });
}
