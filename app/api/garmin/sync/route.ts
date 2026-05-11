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
    const [sleepRaw, hrvRaw, dailyRaw] = await Promise.all([
      fetchConnectSleep(date, displayName, session),
      fetchConnectHRV(date, session),
      fetchConnectDaily(date, displayName, session),
    ]);

    if (!sleepRaw && !hrvRaw && !dailyRaw) {
      return NextResponse.json(
        { error: "Keine Garmin-Daten für dieses Datum verfügbar." },
        { status: 404 }
      );
    }

    const sleep = sleepRaw as Record<string, unknown> | null;
    const hrv = hrvRaw as Record<string, unknown> | null;
    const daily = dailyRaw as Record<string, unknown> | null;

    const n = (v: unknown) => (typeof v === "number" ? v : null);
    const s = (v: unknown) => (typeof v === "string" ? v : null);

    const upsertData = {
      date,
      sleep_start: s(sleep?.startTimeLocal),
      sleep_end: s(sleep?.endTimeLocal),
      sleep_duration_min: sleep?.sleepTimeSeconds ? Math.round(n(sleep.sleepTimeSeconds)! / 60) : null,
      deep_sleep_min: sleep?.deepSleepSeconds ? Math.round(n(sleep.deepSleepSeconds)! / 60) : null,
      light_sleep_min: sleep?.lightSleepSeconds ? Math.round(n(sleep.lightSleepSeconds)! / 60) : null,
      rem_sleep_min: sleep?.remSleepSeconds ? Math.round(n(sleep.remSleepSeconds)! / 60) : null,
      awake_min: sleep?.awakeSleepSeconds ? Math.round(n(sleep.awakeSleepSeconds)! / 60) : null,
      respiratory_rate: n(sleep?.averageRespirationValue),
      spo2_avg: n(sleep?.averageSpO2Value),
      hrv_avg: n(hrv?.lastNight) ?? n(hrv?.weeklyAvg),
      hrv_overnight_avg: n(hrv?.weeklyAvg),
      resting_hr: n(daily?.restingHeartRate),
      body_battery_start: n(daily?.bodyBatteryChargedValue),
      body_battery_end: n(daily?.bodyBatteryDrainedValue),
      stress_avg: n(daily?.averageStressLevel),
      steps: n(daily?.totalSteps),
      active_calories: n(daily?.activeKilocalories),
      total_calories: n(daily?.totalKilocalories),
      floors: n(daily?.floorsAscended),
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
