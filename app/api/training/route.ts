import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const days = parseInt(searchParams.get("days") ?? "30");
    const exercise = searchParams.get("exercise");

    if (id) {
      const workout = await dbGet("SELECT * FROM workouts WHERE id = ?", [id]);
      const exercises = await dbAll("SELECT * FROM exercises WHERE workout_id = ? ORDER BY id ASC", [id]);
      return NextResponse.json({ workout, exercises });
    }

    if (exercise) {
      const history = await dbAll(
        `SELECT e.*, w.date, w.name as workout_name FROM exercises e
         JOIN workouts w ON e.workout_id = w.id
         WHERE e.name = ? ORDER BY w.date DESC LIMIT 20`,
        [exercise]
      );
      const pr = await dbGet("SELECT * FROM personal_records WHERE exercise_name = ? ORDER BY value DESC LIMIT 1", [exercise]);
      return NextResponse.json({ history, pr });
    }

    const workouts = await dbAll("SELECT * FROM workouts ORDER BY date DESC LIMIT ?", [days]);
    const prs = await dbAll("SELECT * FROM personal_records ORDER BY date DESC");
    return NextResponse.json({ workouts, prs });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const { type } = body;

    if (type === "exercise") {
      const { workout_id, name, sets, reps, weight, weight_unit, rpe, notes } = body;
      const r = await dbRun(
        "INSERT INTO exercises (workout_id, name, sets, reps, weight, weight_unit, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [workout_id, name, sets, reps, weight ?? null, weight_unit ?? "kg", rpe ?? null, notes ?? null]
      );

      if (weight) {
        const existingPR = await dbGet<{ value: number }>(
          "SELECT * FROM personal_records WHERE exercise_name = ? ORDER BY value DESC LIMIT 1",
          [name]
        );
        if (!existingPR || weight > existingPR.value) {
          await dbRun(
            "INSERT INTO personal_records (exercise_name, value, unit, date, exercise_id) VALUES (?, ?, ?, ?, ?)",
            [name, weight, weight_unit ?? "kg", todayStr(), r.lastInsertRowid]
          );
        }
      }

      const exercise = await dbGet("SELECT * FROM exercises WHERE id = ?", [r.lastInsertRowid]);
      return NextResponse.json({ exercise });
    }

    const { date, name, workout_type, duration_min, notes, exercises } = body;
    const r = await dbRun(
      "INSERT INTO workouts (date, name, type, duration_min, notes) VALUES (?, ?, ?, ?, ?)",
      [date ?? todayStr(), name, workout_type ?? "strength", duration_min ?? null, notes ?? null]
    );
    const workoutId = r.lastInsertRowid;

    if (exercises?.length) {
      for (const ex of exercises) {
        const exR = await dbRun(
          "INSERT INTO exercises (workout_id, name, sets, reps, weight, weight_unit, rpe, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [workoutId, ex.name, ex.sets, ex.reps, ex.weight ?? null, ex.weight_unit ?? "kg", ex.rpe ?? null, ex.notes ?? null]
        );

        if (ex.weight) {
          const existingPR = await dbGet<{ value: number }>(
            "SELECT * FROM personal_records WHERE exercise_name = ? ORDER BY value DESC LIMIT 1",
            [ex.name]
          );
          if (!existingPR || ex.weight > existingPR.value) {
            await dbRun(
              "INSERT INTO personal_records (exercise_name, value, unit, date, exercise_id) VALUES (?, ?, ?, ?, ?)",
              [ex.name, ex.weight, ex.weight_unit ?? "kg", date ?? todayStr(), exR.lastInsertRowid]
            );
          }
        }
      }
    }

    const workout = await dbGet("SELECT * FROM workouts WHERE id = ?", [workoutId]);
    return NextResponse.json({ workout });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") ?? "workout";

    if (type === "exercise") {
      await dbRun("DELETE FROM exercises WHERE id = ?", [id]);
    } else {
      await dbRun("DELETE FROM workouts WHERE id = ?", [id]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
