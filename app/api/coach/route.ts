import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbGet, initSchema } from "@/lib/db";
import { generateCoachingPlan, CoachTargets } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const focus: "strength" | "aesthetics" | "cardio" = body.focus ?? "cardio";
    const targets: CoachTargets = body.targets ?? {};

    const [health, latestBody, workouts, nutrition, prs] = await Promise.all([
      dbGet<{ rhr?: number; hrv_avg?: number; sleep_duration_min?: number }>(
        "SELECT resting_hr as rhr, hrv_avg, sleep_duration_min FROM health_data ORDER BY date DESC LIMIT 1"
      ),
      dbGet<{ weight?: number; body_fat?: number }>(
        "SELECT weight, body_fat FROM body_metrics ORDER BY date DESC LIMIT 1"
      ),
      dbAll<{ name: string; type: string; date: string }>(
        "SELECT name, type, date FROM workouts ORDER BY date DESC LIMIT 10"
      ),
      dbGet<{ avg_cal: number; avg_protein: number; avg_carbs: number; avg_fat: number }>(`
        SELECT
          COALESCE(ROUND(AVG(cal)), 0) as avg_cal,
          COALESCE(ROUND(AVG(prot)), 0) as avg_protein,
          COALESCE(ROUND(AVG(carbs_sum)), 0) as avg_carbs,
          COALESCE(ROUND(AVG(fat_sum)), 0) as avg_fat
        FROM (
          SELECT date,
            SUM(calories) as cal,
            SUM(protein) as prot,
            SUM(carbs) as carbs_sum,
            SUM(fat) as fat_sum
          FROM food_log
          WHERE date >= date('now', '-7 days')
          GROUP BY date
        )
      `),
      dbAll<{ exercise_name: string; value: number; unit: string }>(
        "SELECT exercise_name, value, unit FROM personal_records ORDER BY date DESC"
      ),
    ]);

    const plan = await generateCoachingPlan({
      focus,
      targets,
      currentStats: {
        rhr: health?.rhr ?? undefined,
        hrv: health?.hrv_avg ?? undefined,
        sleep_h: health?.sleep_duration_min ? health.sleep_duration_min / 60 : undefined,
        weight: latestBody?.weight ?? undefined,
        body_fat: latestBody?.body_fat ?? undefined,
      },
      recentWorkouts: workouts,
      nutrition7days: nutrition ?? { avg_cal: 0, avg_protein: 0, avg_carbs: 0, avg_fat: 0 },
      personalRecords: prs,
    });

    return NextResponse.json(plan);
  } catch (err) {
    const msg = String(err).replace(/^Error: /, "");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
