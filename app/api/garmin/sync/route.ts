import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, initSchema } from "@/lib/db";
import { getGarminSession, fetchConnectSleep, fetchConnectHRV, fetchConnectDaily } from "@/lib/garmin-connect";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json().catch(() => ({}));
  const date = body.date ?? todayStr();

  const stored = await getGarminSession();
  if (!stored) {
    return NextResponse.json(
      { error: "Garmin Connect nicht verbunden. Trage Email + Passwort in den Settings ein." },
      { status: 404 }
    );
  }

  const { session, displayName } = stored;

  try {
    const [sleep, hrv, daily] = await Promise.all([
      fetchConnectSleep(date, displayName, session),
      fetchConnectHRV(date, session),
      fetchConnectDaily(date, displayName, session),
    ]);

    if (!sleep && !hrv && !daily) {
      return NextResponse.json(
        { error: "Keine Garmin-Daten für dieses Datum verfügbar." },
        { status: 404 }
      );
    }

    const upsertData = {
      date,
      sleep_start: sleep?.startTimeLocal ?? null,
      sleep_end: sleep?.endTimeLocal ?? null,
      sleep_duration_min: sleep?.sleepTimeSeconds ? Math.round(sleep.sleepTimeSeconds / 60) : null,
      deep_sleep_min: sleep?.deepSleepSeconds ? Math.round(sleep.deepSleepSeconds / 60) : null,
      light_sleep_min: sleep?.lightSleepSeconds ? Math.round(sleep.lightSleepSeconds / 60) : null,
      rem_sleep_min: sleep?.remSleepSeconds ? Math.round(sleep.remSleepSeconds / 60) : null,
      awake_min: sleep?.awakeSleepSeconds ? Math.round(sleep.awakeSleepSeconds / 60) : null,
      respiratory_rate: sleep?.averageRespirationValue ?? null,
      spo2_avg: sleep?.averageSpO2Value ?? null,
      hrv_avg: hrv?.lastNight ?? hrv?.weeklyAvg ?? null,
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
      await dbRun(
        `INSERT INTO health_data (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
        vals
      );
    }

    const row = await dbGet("SELECT * FROM health_data WHERE date = ?", [date]);
    return NextResponse.json({ data: row, synced: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
