import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const days = parseInt(searchParams.get("days") ?? "7");

    if (date) {
      const row = await dbGet("SELECT * FROM health_data WHERE date = ?", [date]);
      return NextResponse.json({ data: row ?? null });
    }

    const rows = await dbAll("SELECT * FROM health_data ORDER BY date DESC LIMIT ?", [days]);
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const date = body.date ?? todayStr();

    const fields = [
      "sleep_start", "sleep_end", "sleep_duration_min", "sleep_score",
      "deep_sleep_min", "light_sleep_min", "rem_sleep_min", "awake_min",
      "hrv_avg", "hrv_overnight_avg", "resting_hr", "respiratory_rate",
      "body_battery_start", "body_battery_end", "stress_avg",
      "steps", "active_calories", "total_calories", "floors", "spo2_avg", "source",
    ];

    const existing = await dbGet<{ id: number }>("SELECT id FROM health_data WHERE date = ?", [date]);
    const activeFields = fields.filter((f) => body[f] !== undefined);
    const activeValues = activeFields.map((f) => body[f]);

    if (existing) {
      if (activeFields.length > 0) {
        const sets = activeFields.map((f) => `${f} = ?`).join(", ");
        await dbRun(`UPDATE health_data SET ${sets} WHERE date = ?`, [...activeValues, date]);
      }
    } else {
      const cols = ["date", ...activeFields];
      const vals = [date, ...activeValues];
      await dbRun(
        `INSERT INTO health_data (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        vals
      );
    }

    const row = await dbGet("SELECT * FROM health_data WHERE date = ?", [date]);
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
