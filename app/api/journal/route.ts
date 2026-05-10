import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/utils";
import { generateJournalInsight } from "@/lib/ai";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayStr();
  const limit = parseInt(searchParams.get("limit") ?? "30");

  if (searchParams.get("all") === "true") {
    const entries = db.prepare("SELECT * FROM journal_entries ORDER BY date DESC LIMIT ?").all(limit);
    return NextResponse.json({ entries });
  }

  const entry = db.prepare("SELECT * FROM journal_entries WHERE date = ?").get(date);
  return NextResponse.json({ entry: entry ?? null });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { date, content, mood, energy, gratitude, wins, challenges } = body;
  const entryDate = date ?? todayStr();

  const existing = db.prepare("SELECT id FROM journal_entries WHERE date = ?").get(entryDate) as { id: number } | undefined;

  let aiInsight: string | undefined;
  if (content && process.env.ANTHROPIC_API_KEY) {
    try {
      aiInsight = await generateJournalInsight({ content, mood, energy, date: entryDate });
    } catch {
      // AI optional - continue without
    }
  }

  if (existing) {
    db.prepare(`
      UPDATE journal_entries SET content = ?, mood = ?, energy = ?, gratitude = ?, wins = ?, challenges = ?, ai_insight = COALESCE(?, ai_insight), updated_at = unixepoch()
      WHERE date = ?
    `).run(content, mood ?? null, energy ?? null, gratitude ?? null, wins ?? null, challenges ?? null, aiInsight ?? null, entryDate);
  } else {
    db.prepare(`
      INSERT INTO journal_entries (date, content, mood, energy, gratitude, wins, challenges, ai_insight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entryDate, content, mood ?? null, energy ?? null, gratitude ?? null, wins ?? null, challenges ?? null, aiInsight ?? null);
  }

  // Update journal streak
  updateStreak(db, "journal", entryDate);

  const entry = db.prepare("SELECT * FROM journal_entries WHERE date = ?").get(entryDate);
  return NextResponse.json({ entry });
}

function updateStreak(db: ReturnType<typeof getDb>, type: string, date: string) {
  const streak = db.prepare("SELECT * FROM streaks WHERE type = ?").get(type) as { current_count: number; longest_count: number; last_date: string | null } | undefined;
  if (!streak) return;

  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split("T")[0];

  let newCount = 1;
  if (streak.last_date === yStr) {
    newCount = (streak.current_count ?? 0) + 1;
  } else if (streak.last_date === date) {
    return; // Already counted today
  }

  const newLongest = Math.max(newCount, streak.longest_count ?? 0);
  db.prepare("UPDATE streaks SET current_count = ?, longest_count = ?, last_date = ?, updated_at = unixepoch() WHERE type = ?")
    .run(newCount, newLongest, date, type);
}
