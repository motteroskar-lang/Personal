import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, initSchema } from "@/lib/db";
import { fetchGarminSleep, fetchGarminHRV, fetchGarminDaily } from "@/lib/garmin";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json().catch(() => ({}));
  const date = body.date ?? todayStr();

  try {
    const [sleep, hrv, daily] = await Promise.all([
      fetchGarminSleep(date),
      fetchGarminHRV(date),
      fetchGarminDaily(date),
    ]);

    if (!sleep && !hrv && !daily) {
      return NextResponse.json({ error: "No Garmin data available. Connect your Garmin account in Settings." }, { status: 404 });
    }

    const upsertData = {
      date,
      sleep_start: sleep?.startTimeLocal ?? null,
      sleep_end: sleep?.endTimeLocal ?? null,
      sleep_duration_min: sleep ? Math.round(sleep.durationInSeconds / 60) : null,
      deep_sleep_min: sleep ? Math.round(sleep.deepSleepSeconds / 60) : null,
      light_sleep_min: sleep ? Math.round(sleep.lightSleepSeconds / 60) : null,
      rem_sleep_min: sleep ? Math.round(sleep.remSleepSeconds / 60) : null,
      awake_min: sleep ? Math.round(sleep.awakeSleepSeconds / 60) : null,
      respiratory_rate: sleep?.averageRespirationValue ?? null,
      spo2_avg: sleep?.averageSpO2Value ?? null,
      hrv_avg: hrv?.lastNight ?? null,
      hrv_overnight_avg: hrv?.weeklyAvg ?? null,
      resting_hr: daily?.restingHeartRate ?? null,
      body_battery_start: daily?.bodyBatteryChargedValue ?? null,
      body_battery_end: daily?.bodyBatteryDrainedValue ?? null,
      stress_avg: daily?.averageStressLevel ?? null,
      steps: daily?.totalSteps ?? null,
      active_calories: daily?.activeKilocalories ?? null,
      total_calories: daily?.totalKilocalories ?? null,
      floors: daily?.floorsAscended ?? null,
      source: "garmin",
    };

    const existing = await dbGet<{ id: number }>("SELECT id FROM health_data WHERE date = ?", [date]);

    if (existing) {
      const keys = Object.keys(upsertData).filter(k => k !== "date");
      const vals = keys.map(k => upsertData[k as keyof typeof upsertData]);
      const sets = keys.map(k => `${k} = ?`).join(", ");
      await dbRun(`UPDATE health_data SET ${sets} WHERE date = ?`, [...vals, date]);
    } else {
      const keys = Object.keys(upsertData);
      const vals = Object.values(upsertData);
      const placeholders = keys.map(() => "?").join(", ");
      await dbRun(
        `INSERT INTO health_data (${keys.join(", ")}) VALUES (${placeholders})`,
        vals
      );
    }

    const row = await dbGet("SELECT * FROM health_data WHERE date = ?", [date]);
    return NextResponse.json({ data: row, synced: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
