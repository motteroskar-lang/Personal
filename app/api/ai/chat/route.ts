import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { chatWithAI } from "@/lib/ai";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
  }

  try {
    const db = getDb();
    const today = todayStr();

    // Build context snapshot
    const goals = db.prepare("SELECT title, urgency, current_value, target_value FROM goals WHERE status = 'active' LIMIT 5").all() as Array<{ title: string; urgency: string; current_value?: number; target_value?: number }>;
    const health = db.prepare("SELECT sleep_duration_min, hrv_avg, resting_hr FROM health_data ORDER BY date DESC LIMIT 1").get() as { sleep_duration_min?: number; hrv_avg?: number; resting_hr?: number } | undefined;
    const todayTasks = db.prepare("SELECT text, done FROM daily_tasks WHERE date = ?").all(today) as Array<{ text: string; done: number }>;
    const nutrition = db.prepare("SELECT SUM(calories) as cal, SUM(protein) as prot FROM food_log WHERE date = ?").get(today) as { cal: number; prot: number } | undefined;

    const context = `
Today: ${today}
Active Goals: ${goals.map(g => `${g.title} [${g.urgency}]`).join(", ")}
Last Sleep: ${health?.sleep_duration_min ? (health.sleep_duration_min / 60).toFixed(1) + "h" : "unknown"} | HRV: ${health?.hrv_avg ?? "?"}ms
Today's Tasks: ${todayTasks.length} total, ${todayTasks.filter(t => t.done).length} done
Calories Today: ${Math.round(nutrition?.cal ?? 0)} kcal | Protein: ${Math.round(nutrition?.prot ?? 0)}g`;

    const response = await chatWithAI(message, context);
    return NextResponse.json({ response });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
