import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const days = parseInt(searchParams.get("days") ?? "90");

    if (date) {
      const row = await dbGet("SELECT * FROM body_metrics WHERE date = ?", [date]);
      return NextResponse.json({ data: row ?? null });
    }

    const rows = await dbAll("SELECT * FROM body_metrics ORDER BY date DESC LIMIT ?", [days]);
    // Also get the latest entry
    const latest = rows[0] ?? null;
    return NextResponse.json({ data: rows, latest });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const body = await req.json();
    const date = body.date ?? todayStr();

    const fields = ["weight_kg", "body_fat_pct", "muscle_mass_kg", "waist_cm", "chest_cm", "arm_cm", "notes"];
    const existing = await dbGet<{ id: number }>("SELECT id FROM body_metrics WHERE date = ?", [date]);

    const activeFields = fields.filter(f => body[f] !== undefined && body[f] !== "");
    const activeValues = activeFields.map(f => body[f] === "" ? null : body[f]);

    if (existing) {
      if (activeFields.length > 0) {
        const sets = activeFields.map(f => `${f} = ?`).join(", ");
        await dbRun(`UPDATE body_metrics SET ${sets} WHERE date = ?`, [...activeValues, date]);
      }
    } else {
      const cols = ["date", ...activeFields];
      const vals = [date, ...activeValues];
      await dbRun(
        `INSERT INTO body_metrics (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        vals
      );
    }

    const row = await dbGet("SELECT * FROM body_metrics WHERE date = ?", [date]);
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await dbRun("DELETE FROM body_metrics WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
