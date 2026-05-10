import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? todayStr();
  const days = parseInt(searchParams.get("days") ?? "1");

  if (days > 1) {
    const logs = db.prepare(
      "SELECT date, SUM(calories) as total_cal, SUM(protein) as total_protein, SUM(carbs) as total_carbs, SUM(fat) as total_fat FROM food_log WHERE date >= date(?, ?) GROUP BY date ORDER BY date DESC"
    ).all(date, `-${days - 1} days`);
    const goals = db.prepare("SELECT * FROM nutrition_goals WHERE id = 1").get();
    return NextResponse.json({ logs, goals });
  }

  const entries = db.prepare(
    "SELECT * FROM food_log WHERE date = ? ORDER BY created_at ASC"
  ).all(date);
  const goals = db.prepare("SELECT * FROM nutrition_goals WHERE id = 1").get();

  interface FoodRow { calories: number; protein: number; carbs: number; fat: number }
  const totals = (entries as FoodRow[]).reduce((acc, e) => ({
    calories: acc.calories + (e.calories ?? 0),
    protein: acc.protein + (e.protein ?? 0),
    carbs: acc.carbs + (e.carbs ?? 0),
    fat: acc.fat + (e.fat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return NextResponse.json({ entries, totals, goals });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  if (body.type === "goals") {
    const { calories, protein, carbs, fat } = body;
    db.prepare(
      "INSERT OR REPLACE INTO nutrition_goals (id, calories, protein, carbs, fat, updated_at) VALUES (1, ?, ?, ?, ?, unixepoch())"
    ).run(calories, protein, carbs, fat);
    return NextResponse.json({ ok: true });
  }

  const { date, meal_type, food_name, amount, unit, calories, protein, carbs, fat, fiber } = body;
  const result = db.prepare(
    "INSERT INTO food_log (date, meal_type, food_name, amount, unit, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    date ?? todayStr(), meal_type ?? "snack", food_name,
    amount ?? null, unit ?? "g",
    calories ?? 0, protein ?? 0, carbs ?? 0, fat ?? 0, fiber ?? 0
  );

  const entry = db.prepare("SELECT * FROM food_log WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ entry });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  db.prepare("DELETE FROM food_log WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
