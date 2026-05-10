import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateAIInsights } from "@/lib/ai";
import { todayStr } from "@/lib/utils";

export async function GET() {
  const db = getDb();
  const today = todayStr();

  // Return cached insights from today first
  const cached = db.prepare(
    "SELECT * FROM ai_insights WHERE date = ? ORDER BY priority DESC, created_at DESC"
  ).all(today);

  return NextResponse.json({ insights: cached });
}

export async function POST() {
  const db = getDb();
  const today = todayStr();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
  }

  try {
    const goals = db.prepare("SELECT title, status, urgency FROM goals WHERE status = 'active'").all() as Array<{ title: string; status: string; urgency: string }>;
    const healthTrend = db.prepare("SELECT date, hrv_avg, sleep_duration_min FROM health_data ORDER BY date DESC LIMIT 7").all() as Array<{ date: string; hrv_avg?: number; sleep_duration_min?: number }>;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const workoutCount = (db.prepare(
      "SELECT COUNT(*) as cnt FROM workouts WHERE date >= ?"
    ).get(sevenDaysAgo.toISOString().split("T")[0]) as { cnt: number }).cnt;

    const avgCaloriesRow = db.prepare(
      "SELECT AVG(s) as avg FROM (SELECT SUM(calories) as s FROM food_log WHERE date >= ? GROUP BY date)"
    ).get(sevenDaysAgo.toISOString().split("T")[0]) as { avg: number };

    const financeSummary = db.prepare(`
      SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
             category, SUM(amount) as cat_total
      FROM finance_transactions WHERE date >= ?
      GROUP BY category ORDER BY cat_total DESC LIMIT 1
    `).get(sevenDaysAgo.toISOString().split("T")[0]) as { income: number; expense: number; category: string } | undefined;

    const insights = await generateAIInsights({
      goals,
      healthTrend,
      workoutFrequency: workoutCount,
      avgCalories: Math.round(avgCaloriesRow?.avg ?? 0),
      financialHealth: financeSummary ? {
        savings_rate: Math.round((1 - financeSummary.expense / (financeSummary.income || 1)) * 100),
        top_category: financeSummary.category,
      } : undefined,
    });

    // Save insights
    const insert = db.prepare(
      "INSERT INTO ai_insights (date, type, category, content, priority) VALUES (?, ?, ?, ?, ?)"
    );
    for (const insight of insights) {
      insert.run(today, insight.type, insight.category ?? null, insight.content, insight.priority);
    }

    return NextResponse.json({ insights });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
