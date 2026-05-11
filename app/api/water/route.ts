import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? todayStr();

    const row = await dbGet<{ amount_ml: number; goal_ml: number }>(
      "SELECT amount_ml, goal_ml FROM water_intake WHERE date = ?", [date]
    );
    return NextResponse.json({ amount_ml: row?.amount_ml ?? 0, goal_ml: row?.goal_ml ?? 2500 });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const date = body.date ?? todayStr();

    if (body.type === "add") {
      // Add ml to current total
      const ml = parseInt(body.amount_ml) || 0;
      await dbRun(
        `INSERT INTO water_intake (date, amount_ml, goal_ml) VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET amount_ml = MIN(amount_ml + ?, goal_ml * 2), updated_at = unixepoch()`,
        [date, ml, body.goal_ml ?? 2500, ml]
      );
    } else if (body.type === "set") {
      // Set absolute value
      await dbRun(
        `INSERT INTO water_intake (date, amount_ml, goal_ml) VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET amount_ml = ?, goal_ml = ?, updated_at = unixepoch()`,
        [date, body.amount_ml, body.goal_ml ?? 2500, body.amount_ml, body.goal_ml ?? 2500]
      );
    } else if (body.type === "goal") {
      await dbRun(
        `INSERT INTO water_intake (date, amount_ml, goal_ml) VALUES (?, 0, ?)
         ON CONFLICT(date) DO UPDATE SET goal_ml = ?, updated_at = unixepoch()`,
        [date, body.goal_ml, body.goal_ml]
      );
    }

    const row = await dbGet<{ amount_ml: number; goal_ml: number }>(
      "SELECT amount_ml, goal_ml FROM water_intake WHERE date = ?", [date]
    );
    return NextResponse.json({ amount_ml: row?.amount_ml ?? 0, goal_ml: row?.goal_ml ?? 2500 });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
