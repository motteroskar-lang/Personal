import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, dbAll, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { generateJournalInsight } from "@/lib/ai";

export async function GET(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayStr();
  const limit = parseInt(searchParams.get("limit") ?? "30");

  if (searchParams.get("all") === "true") {
    const entries = await dbAll("SELECT * FROM journal_entries ORDER BY date DESC LIMIT ?", [limit]);
    return NextResponse.json({ entries });
  }

  const entry = await dbGet("SELECT * FROM journal_entries WHERE date = ?", [date]);
  return NextResponse.json({ entry: entry ?? null });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();
  const { date, content, mood, energy, gratitude, wins, challenges } = body;
  const entryDate = date ?? todayStr();

  const existing = await dbGet<{ id: number }>("SELECT id FROM journal_entries WHERE date = ?", [entryDate]);

  let aiInsight: string | undefined;
  if (content && process.env.ANTHROPIC_API_KEY) {
    try {
      aiInsight = await generateJournalInsight({ content, mood, energy, date: entryDate });
    } catch {
      // AI is optional
    }
  }

  if (existing) {
    await dbRun(
      `UPDATE journal_entries SET content = ?, mood = ?, energy = ?, gratitude = ?, wins = ?, challenges = ?,
       ai_insight = COALESCE(?, ai_insight), updated_at = unixepoch() WHERE date = ?`,
      [content, mood ?? null, energy ?? null, gratitude ?? null, wins ?? null, challenges ?? null, aiInsight ?? null, entryDate]
    );
  } else {
    await dbRun(
      "INSERT INTO journal_entries (date, content, mood, energy, gratitude, wins, challenges, ai_insight) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [entryDate, content, mood ?? null, energy ?? null, gratitude ?? null, wins ?? null, challenges ?? null, aiInsight ?? null]
    );
  }

  await updateStreak("journal", entryDate);

  const entry = await dbGet("SELECT * FROM journal_entries WHERE date = ?", [entryDate]);
  return NextResponse.json({ entry });
}

async function updateStreak(type: string, date: string) {
  const streak = await dbGet<{ current_count: number; longest_count: number; last_date: string | null }>(
    "SELECT * FROM streaks WHERE type = ?",
    [type]
  );
  if (!streak) return;

  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];

  let newCount = 1;
  if (streak.last_date === yStr) {
    newCount = (streak.current_count ?? 0) + 1;
  } else if (streak.last_date === date) {
    return;
  }

  const newLongest = Math.max(newCount, streak.longest_count ?? 0);
  await dbRun(
    "UPDATE streaks SET current_count = ?, longest_count = ?, last_date = ?, updated_at = unixepoch() WHERE type = ?",
    [newCount, newLongest, date, type]
  );
}
