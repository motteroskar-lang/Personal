import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? todayStr();
    const type = searchParams.get("type") ?? "long_term";

    if (type === "daily") {
      const tasks = await dbAll("SELECT * FROM daily_tasks WHERE date = ? ORDER BY id ASC", [date]);
      return NextResponse.json({ tasks });
    }

    const goals = await dbAll("SELECT * FROM goals WHERE status = 'active' ORDER BY urgency DESC, deadline ASC");
    return NextResponse.json({ goals });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const { type } = body;

    if (type === "daily") {
      const { date, text, goal_id, ai_generated } = body;
      const r = await dbRun(
        "INSERT INTO daily_tasks (date, text, done, queued, goal_id, ai_generated) VALUES (?, ?, 0, 0, ?, ?)",
        [date ?? todayStr(), text, goal_id ?? null, ai_generated ? 1 : 0]
      );
      const task = await dbGet("SELECT * FROM daily_tasks WHERE id = ?", [r.lastInsertRowid]);
      return NextResponse.json({ task });
    }

    const { title, description, category, target_value, unit, deadline, urgency } = body;
    const r = await dbRun(
      "INSERT INTO goals (title, description, category, target_value, unit, deadline, urgency) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, description ?? null, category ?? "personal", target_value ?? null, unit ?? null, deadline ?? null, urgency ?? "medium"]
    );
    const goal = await dbGet("SELECT * FROM goals WHERE id = ?", [r.lastInsertRowid]);
    return NextResponse.json({ goal });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const { id, type } = body;

    if (type === "daily") {
      const { done, queued } = body;
      if (done !== undefined) await dbRun("UPDATE daily_tasks SET done = ? WHERE id = ?", [done ? 1 : 0, id]);
      if (queued !== undefined) await dbRun("UPDATE daily_tasks SET queued = ? WHERE id = ?", [queued ? 1 : 0, id]);
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
      await dbRun(`UPDATE goals SET ${updates.join(", ")} WHERE id = ?`, [...values, id]);
    }

    const goal = await dbGet("SELECT * FROM goals WHERE id = ?", [id]);
    return NextResponse.json({ goal });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") ?? "long_term";

    if (type === "daily") {
      await dbRun("DELETE FROM daily_tasks WHERE id = ?", [id]);
    } else {
      await dbRun("DELETE FROM goals WHERE id = ?", [id]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
