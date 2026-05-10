import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateDailyPlan } from "@/lib/ai";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const date = body.date ?? todayStr();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
  }

  try {
    const goals = db.prepare(
      "SELECT title, category, urgency, current_value, target_value, deadline FROM goals WHERE status = 'active' ORDER BY urgency DESC"
    ).all() as Array<{ title: string; category: string; urgency: string; current_value?: number; target_value?: number; deadline?: string }>;

    const health = db.prepare(
      "SELECT sleep_duration_min, hrv_avg, resting_hr, body_battery_start FROM health_data ORDER BY date DESC LIMIT 1"
    ).get() as { sleep_duration_min?: number; hrv_avg?: number; resting_hr?: number; body_battery_start?: number } | undefined;

    const recentWorkouts = db.prepare(
      "SELECT name, date FROM workouts ORDER BY date DESC LIMIT 3"
    ).all() as Array<{ name: string; date: string }>;

    const screenTime = db.prepare(
      "SELECT total_minutes FROM screen_time ORDER BY date DESC LIMIT 1"
    ).get() as { total_minutes: number } | undefined;

    const nutritionToday = db.prepare(
      "SELECT SUM(calories) as calories, SUM(protein) as protein FROM food_log WHERE date = ?"
    ).get(date) as { calories: number; protein: number } | undefined;

    const plan = await generateDailyPlan({
      goals,
      recentHealth: health,
      recentWorkouts,
      nutrition: nutritionToday,
      screenTime,
      todayDate: date,
    });

    // Clear old AI tasks for today and insert new ones
    db.prepare("DELETE FROM daily_tasks WHERE date = ? AND ai_generated = 1").run(date);

    const insert = db.prepare(
      "INSERT INTO daily_tasks (date, text, done, ai_generated) VALUES (?, ?, 0, 1)"
    );
    for (const task of plan.tasks) {
      insert.run(date, task);
    }

    // Save alert if present
    if (plan.urgentAlert) {
      db.prepare(
        "INSERT INTO ai_insights (date, type, content, priority) VALUES (?, 'alert', ?, 'high')"
      ).run(date, plan.urgentAlert);
    }

    return NextResponse.json({ plan, tasks: plan.tasks });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
