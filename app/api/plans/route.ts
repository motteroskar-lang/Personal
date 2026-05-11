import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, dbRun, initSchema } from "@/lib/db";

export async function GET() {
  await initSchema();
  const plans = await dbAll<{
    id: number; category: string; title: string; goal_description: string;
    personality_fit: string; fit_level: string; daily_action: string;
    next_milestone: string; quick_wins: string; plan_json: string;
    status: string; created_at: number; timeframe: string;
  }>("SELECT * FROM plans WHERE status = 'active' ORDER BY created_at DESC");

  return NextResponse.json({ plans: plans.map(p => ({
    ...p,
    quick_wins: tryParse(p.quick_wins, []),
    plan_json: tryParse(p.plan_json, {}),
  })) });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();
  const {
    category, title, goal_description, current_state, timeframe,
    personality_fit, fit_level, daily_action, next_milestone,
    quick_wins, plan_json,
  } = body;

  const existing = await dbGet<{ id: number }>(
    "SELECT id FROM plans WHERE category = ? AND status = 'active'",
    [category]
  );

  if (existing) {
    await dbRun(
      `UPDATE plans SET title=?, goal_description=?, current_state=?, timeframe=?,
       personality_fit=?, fit_level=?, daily_action=?, next_milestone=?,
       quick_wins=?, plan_json=?, updated_at=unixepoch()
       WHERE id=?`,
      [title, goal_description, current_state, timeframe,
       personality_fit, fit_level, daily_action, next_milestone,
       JSON.stringify(quick_wins), JSON.stringify(plan_json), existing.id]
    );
    return NextResponse.json({ ok: true, id: existing.id, updated: true });
  }

  await dbRun(
    `INSERT INTO plans (category, title, goal_description, current_state, timeframe,
     personality_fit, fit_level, daily_action, next_milestone, quick_wins, plan_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [category, title, goal_description, current_state, timeframe,
     personality_fit, fit_level, daily_action, next_milestone,
     JSON.stringify(quick_wins), JSON.stringify(plan_json)]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await initSchema();
  const { id } = await req.json();
  await dbRun("UPDATE plans SET status = 'archived' WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}

function tryParse(v: string, fallback: unknown) {
  try { return JSON.parse(v); } catch { return fallback; }
}
