import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const days = parseInt(searchParams.get("days") ?? "30");
  const exercise = searchParams.get("exercise");

  if (id) {
    const workout = db.prepare("SELECT * FROM workouts WHERE id = ?").get(id);
    const exercises = db.prepare("SELECT * FROM exercises WHERE workout_id = ? ORDER BY id ASC").all(id);
    return NextResponse.json({ workout, exercises });
  }

  if (exercise) {
    const history = db.prepare(`
      SELECT e.*, w.date, w.name as workout_name FROM exercises e
      JOIN workouts w ON e.workout_id = w.id
      WHERE e.name = ? ORDER BY w.date DESC LIMIT 20
    `).all(exercise);
    const pr = db.prepare("SELECT * FROM personal_records WHERE exercise_name = ? ORDER BY value DESC LIMIT 1").get(exercise);
    return NextResponse.json({ history, pr });
  }

  const workouts = db.prepare(
    "SELECT * FROM workouts ORDER BY date DESC LIMIT ?"
  ).all(days);

  const prs = db.prepare("SELECT * FROM personal_records ORDER BY date DESC").all();

  return NextResponse.json({ workouts, prs });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { type } = body;

  if (type === "exercise") {
    const { workout_id, name, sets, reps, weight, weight_unit, rpe, notes } = body;
    const result = db.prepare(
      "INSERT INTO exercises (workout_id, name, sets, reps, weight, weight_unit, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(workout_id, name, sets, reps, weight ?? null, weight_unit ?? "kg", rpe ?? null, notes ?? null);

    // Check for PR
    if (weight) {
      const existingPR = db.prepare(
        "SELECT * FROM personal_records WHERE exercise_name = ? ORDER BY value DESC LIMIT 1"
      ).get(name) as { value: number } | undefined;

      if (!existingPR || weight > existingPR.value) {
        db.prepare(
          "INSERT INTO personal_records (exercise_name, value, unit, date, exercise_id) VALUES (?, ?, ?, ?, ?)"
        ).run(name, weight, weight_unit ?? "kg", todayStr(), result.lastInsertRowid);
      }
    }

    const exercise = db.prepare("SELECT * FROM exercises WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ exercise, isPR: true });
  }

  // Create workout
  const { date, name, workout_type, duration_min, notes, exercises } = body;
  const result = db.prepare(
    "INSERT INTO workouts (date, name, type, duration_min, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(date ?? todayStr(), name, workout_type ?? "strength", duration_min ?? null, notes ?? null);

  const workoutId = result.lastInsertRowid;

  if (exercises?.length) {
    const insertExercise = db.prepare(
      "INSERT INTO exercises (workout_id, name, sets, reps, weight, weight_unit, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );

    for (const ex of exercises) {
      const exResult = insertExercise.run(workoutId, ex.name, ex.sets, ex.reps, ex.weight ?? null, ex.weight_unit ?? "kg", ex.rpe ?? null, ex.notes ?? null);

      if (ex.weight) {
        const existingPR = db.prepare(
          "SELECT * FROM personal_records WHERE exercise_name = ? ORDER BY value DESC LIMIT 1"
        ).get(ex.name) as { value: number } | undefined;

        if (!existingPR || ex.weight > existingPR.value) {
          db.prepare(
            "INSERT INTO personal_records (exercise_name, value, unit, date, exercise_id) VALUES (?, ?, ?, ?, ?)"
          ).run(ex.name, ex.weight, ex.weight_unit ?? "kg", date ?? todayStr(), exResult.lastInsertRowid);
        }
      }
    }
  }

  const workout = db.prepare("SELECT * FROM workouts WHERE id = ?").get(workoutId);
  return NextResponse.json({ workout });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "workout";

  if (type === "exercise") {
    db.prepare("DELETE FROM exercises WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM workouts WHERE id = ?").run(id);
  }
  return NextResponse.json({ ok: true });
}
