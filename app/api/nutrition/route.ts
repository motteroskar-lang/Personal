import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayStr();
  const days = parseInt(searchParams.get("days") ?? "1");

  if (days > 1) {
    const logs = await dbAll(
      `SELECT date, SUM(calories) as total_cal, SUM(protein) as total_protein, SUM(carbs) as total_carbs, SUM(fat) as total_fat
       FROM food_log WHERE date >= date(?, ?) GROUP BY date ORDER BY date DESC`,
      [date, `-${days - 1} days`]
    );
    const goals = await dbGet("SELECT * FROM nutrition_goals WHERE id = 1");
    return NextResponse.json({ logs, goals });
  }

  const entries = await dbAll("SELECT * FROM food_log WHERE date = ? ORDER BY created_at ASC", [date]);
  const goals = await dbGet("SELECT * FROM nutrition_goals WHERE id = 1");

  interface FoodRow { calories: number; protein: number; carbs: number; fat: number }
  const totals = (entries as FoodRow[]).reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.protein ?? 0),
      carbs: acc.carbs + (e.carbs ?? 0),
      fat: acc.fat + (e.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return NextResponse.json({ entries, totals, goals });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();

  if (body.type === "goals") {
    const { calories, protein, carbs, fat } = body;
    await dbRun(
      "INSERT OR REPLACE INTO nutrition_goals (id, calories, protein, carbs, fat, updated_at) VALUES (1, ?, ?, ?, ?, unixepoch())",
      [calories, protein, carbs, fat]
    );
    return NextResponse.json({ ok: true });
  }

  const { date, meal_type, food_name, amount, unit, calories, protein, carbs, fat, fiber } = body;
  const r = await dbRun(
    "INSERT INTO food_log (date, meal_type, food_name, amount, unit, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [date ?? todayStr(), meal_type ?? "snack", food_name, amount ?? null, unit ?? "g", calories ?? 0, protein ?? 0, carbs ?? 0, fat ?? 0, fiber ?? 0]
  );
  const entry = await dbGet("SELECT * FROM food_log WHERE id = ?", [r.lastInsertRowid]);
  return NextResponse.json({ entry });
}

export async function DELETE(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await dbRun("DELETE FROM food_log WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
