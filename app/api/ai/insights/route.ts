import { NextResponse } from "next/server";
import { dbAll, dbRun, dbGet, initSchema } from "@/lib/db";
import { generateAIInsights } from "@/lib/ai";
import { todayStr } from "@/lib/utils";

export async function GET() {
  await initSchema();
  const today = todayStr();
  const insights = await dbAll(
    "SELECT * FROM ai_insights WHERE date = ? ORDER BY priority DESC, created_at DESC",
    [today]
  );
  return NextResponse.json({ insights });
}

export async function POST() {
  await initSchema();
  const today = todayStr();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
  }

  try {
    const goals = await dbAll<{ title: string; status: string; urgency: string }>(
      "SELECT title, status, urgency FROM goals WHERE status = 'active'"
    );
    const healthTrend = await dbAll<{ date: string; hrv_avg?: number; sleep_duration_min?: number }>(
      "SELECT date, hrv_avg, sleep_duration_min FROM health_data ORDER BY date DESC LIMIT 7"
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const workoutRow = await dbGet<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM workouts WHERE date >= ?",
      [weekAgoStr]
    );
    const avgCalRow = await dbGet<{ avg: number }>(
      "SELECT AVG(s) as avg FROM (SELECT SUM(calories) as s FROM food_log WHERE date >= ? GROUP BY date)",
      [weekAgoStr]
    );
    const finRow = await dbGet<{ income: number; expense: number; category: string }>(
      `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
              SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
              category
       FROM finance_transactions WHERE date >= ?
       GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1`,
      [weekAgoStr]
    );

    const insights = await generateAIInsights({
      goals,
      healthTrend,
      workoutFrequency: workoutRow?.cnt ?? 0,
      avgCalories: Math.round(avgCalRow?.avg ?? 0),
      financialHealth: finRow
        ? {
            savings_rate: Math.round((1 - finRow.expense / (finRow.income || 1)) * 100),
            top_category: finRow.category,
          }
        : undefined,
    });

    for (const insight of insights) {
      await dbRun(
        "INSERT INTO ai_insights (date, type, category, content, priority) VALUES (?, ?, ?, ?, ?)",
        [today, insight.type, insight.category ?? null, insight.content, insight.priority]
      );
    }

    return NextResponse.json({ insights });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
