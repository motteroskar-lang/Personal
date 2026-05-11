import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

// Returns habits list with today's completion + 7-day streak per habit
export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? todayStr();
    const history = searchParams.get("history") === "true";

    const habits = await dbAll<{
      id: number; name: string; icon: string; color: string;
      category: string; time_of_day: string; sort_order: number;
    }>("SELECT * FROM habits WHERE active = 1 ORDER BY sort_order ASC, id ASC");

    // For each habit, fetch today's completion and streak
    const result = await Promise.all(habits.map(async (h) => {
      const todayLog = await dbGet<{ done: number }>(
        "SELECT done FROM habit_logs WHERE habit_id = ? AND date = ?", [h.id, date]
      );

      // Compute streak: count consecutive days completed backwards from date
      const logs = await dbAll<{ date: string; done: number }>(
        "SELECT date, done FROM habit_logs WHERE habit_id = ? AND done = 1 ORDER BY date DESC LIMIT 365",
        [h.id]
      );
      const logSet = new Set(logs.map(l => l.date));
      let streak = 0;
      const d = new Date(date);
      while (true) {
        const s = d.toISOString().split("T")[0];
        if (!logSet.has(s)) break;
        streak++;
        d.setDate(d.getDate() - 1);
      }

      // 28-day history heatmap
      let weekData: { date: string; done: boolean }[] = [];
      if (history) {
        const rows = await dbAll<{ date: string; done: number }>(
          "SELECT date, done FROM habit_logs WHERE habit_id = ? AND date >= date(?, '-27 days') ORDER BY date ASC",
          [h.id, date]
        );
        const rowMap = new Map(rows.map(r => [r.date, r.done === 1]));
        for (let i = 27; i >= 0; i--) {
          const dd = new Date(date);
          dd.setDate(dd.getDate() - i);
          const ds = dd.toISOString().split("T")[0];
          weekData.push({ date: ds, done: rowMap.get(ds) ?? false });
        }
      }

      return { ...h, done: todayLog?.done === 1, streak, weekData };
    }));

    // Completion stats for today
    const total = result.length;
    const done = result.filter(h => h.done).length;

    return NextResponse.json({ habits: result, stats: { total, done } });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();

    // Toggle log
    if (body.type === "log") {
      const { habit_id, date, done } = body;
      if (done) {
        await dbRun(
          "INSERT OR REPLACE INTO habit_logs (habit_id, date, done) VALUES (?, ?, 1)",
          [habit_id, date ?? todayStr()]
        );
      } else {
        await dbRun("DELETE FROM habit_logs WHERE habit_id = ? AND date = ?", [habit_id, date ?? todayStr()]);
      }
      return NextResponse.json({ ok: true });
    }

    // Create habit
    const { name, icon, color, category, time_of_day } = body;
    const maxOrder = await dbGet<{ m: number }>("SELECT MAX(sort_order) as m FROM habits");
    const r = await dbRun(
      "INSERT INTO habits (name, icon, color, category, time_of_day, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [name, icon ?? "✓", color ?? "#6BE3A4", category ?? "health", time_of_day ?? "anytime", (maxOrder?.m ?? 0) + 1]
    );
    const habit = await dbGet("SELECT * FROM habits WHERE id = ?", [r.lastInsertRowid]);
    return NextResponse.json({ habit });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const { id, name, icon, color, category, time_of_day, active, sort_order } = body;

    const updates: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (icon !== undefined) { updates.push("icon = ?"); values.push(icon); }
    if (color !== undefined) { updates.push("color = ?"); values.push(color); }
    if (category !== undefined) { updates.push("category = ?"); values.push(category); }
    if (time_of_day !== undefined) { updates.push("time_of_day = ?"); values.push(time_of_day); }
    if (active !== undefined) { updates.push("active = ?"); values.push(active ? 1 : 0); }
    if (sort_order !== undefined) { updates.push("sort_order = ?"); values.push(sort_order); }

    if (updates.length > 0) {
      await dbRun(`UPDATE habits SET ${updates.join(", ")} WHERE id = ?`, [...values, id]);
    }
    const habit = await dbGet("SELECT * FROM habits WHERE id = ?", [id]);
    return NextResponse.json({ habit });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await dbRun("UPDATE habits SET active = 0 WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
