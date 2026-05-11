import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const date = body.date ?? todayStr();

    const num = (v: unknown) => (v !== undefined && v !== null && v !== "" ? Number(v) : undefined);

    const fields: Record<string, number | string> = { source: "apple_health" };

    // Sleep: accept either minutes directly or hours (convert)
    const sleepMin = num(body.sleep_duration_min) ?? (body.sleep_hours ? Math.round(Number(body.sleep_hours) * 60) : undefined);
    if (sleepMin) fields.sleep_duration_min = Math.round(sleepMin);
    if (num(body.sleep_score)) fields.sleep_score = Math.round(num(body.sleep_score)!);
    if (num(body.deep_sleep_min)) fields.deep_sleep_min = Math.round(num(body.deep_sleep_min)!);
    if (num(body.rem_sleep_min)) fields.rem_sleep_min = Math.round(num(body.rem_sleep_min)!);
    if (num(body.hrv_avg)) fields.hrv_avg = Math.round(num(body.hrv_avg)! * 10) / 10;
    if (num(body.resting_hr)) fields.resting_hr = Math.round(num(body.resting_hr)!);
    if (num(body.respiratory_rate)) fields.respiratory_rate = Math.round(num(body.respiratory_rate)! * 10) / 10;
    if (num(body.body_battery_start)) fields.body_battery_start = Math.round(num(body.body_battery_start)!);
    if (num(body.stress_avg)) fields.stress_avg = Math.round(num(body.stress_avg)!);
    if (num(body.steps)) fields.steps = Math.round(num(body.steps)!);
    if (num(body.active_calories)) fields.active_calories = Math.round(num(body.active_calories)!);
    if (num(body.spo2_avg)) fields.spo2_avg = Math.round(num(body.spo2_avg)! * 10) / 10;

    const existing = await dbGet<{ id: number }>("SELECT id FROM health_data WHERE date = ?", [date]);
    if (existing) {
      const sets = Object.keys(fields).map(f => `${f} = ?`).join(", ");
      await dbRun(`UPDATE health_data SET ${sets} WHERE date = ?`, [...Object.values(fields), date]);
    } else {
      const cols = ["date", ...Object.keys(fields)];
      const vals = [date, ...Object.values(fields)];
      await dbRun(
        `INSERT INTO health_data (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        vals
      );
    }

    return NextResponse.json({ ok: true, date, imported: Object.keys(fields).filter(k => k !== "source").length });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
