import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { generateDailyPlan } from "@/lib/ai";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json().catch(() => ({}));
  const date = body.date ?? todayStr();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
  }

  try {
    const goals = await dbAll<{ title: string; category: string; urgency: string; current_value?: number; target_value?: number; deadline?: string }>(
      "SELECT title, category, urgency, current_value, target_value, deadline FROM goals WHERE status = 'active' ORDER BY urgency DESC"
    );
    const health = await dbGet<{ sleep_duration_min?: number; hrv_avg?: number; resting_hr?: number; body_battery_start?: number }>(
      "SELECT sleep_duration_min, hrv_avg, resting_hr, body_battery_start FROM health_data ORDER BY date DESC LIMIT 1"
    );
    const recentWorkouts = await dbAll<{ name: string; date: string }>(
      "SELECT name, date FROM workouts ORDER BY date DESC LIMIT 3"
    );
    const screenTime = await dbGet<{ total_minutes: number }>(
      "SELECT total_minutes FROM screen_time ORDER BY date DESC LIMIT 1"
    );
    const nutrition = await dbGet<{ calories: number; protein: number }>(
      "SELECT SUM(calories) as calories, SUM(protein) as protein FROM food_log WHERE date = ?",
      [date]
    );

    const plan = await generateDailyPlan({
      goals,
      recentHealth: health ?? undefined,
      recentWorkouts,
      nutrition: nutrition ?? undefined,
      screenTime: screenTime ?? undefined,
      todayDate: date,
    });

    await dbRun("DELETE FROM daily_tasks WHERE date = ? AND ai_generated = 1", [date]);

    for (const task of plan.tasks) {
      await dbRun("INSERT INTO daily_tasks (date, text, done, ai_generated) VALUES (?, ?, 0, 1)", [date, task]);
    }

    if (plan.urgentAlert) {
      await dbRun(
        "INSERT INTO ai_insights (date, type, content, priority) VALUES (?, 'alert', ?, 'high')",
        [date, plan.urgentAlert]
      );
    }

    return NextResponse.json({ plan, tasks: plan.tasks });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
