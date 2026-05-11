import { NextRequest, NextResponse } from "next/server";
import { dbRun, dbGet, initSchema } from "@/lib/db";

// Flexible CSV parser for MacroFactor Quick Export and Granular Export formats.
// Column names vary by export type; we match case-insensitively.

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function findCol(row: Record<string, string>, candidates: string[]): string | undefined {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key] !== "" && row[key] !== undefined) return row[key];
  }
  return undefined;
}

function num(v: string | undefined): number | null {
  if (!v || v === "" || v === "-") return null;
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  try {
    await initSchema();
    const text = await req.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Keine Daten in der CSV gefunden" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const dateRaw = findCol(row, ["date", "datum"]);
      if (!dateRaw) { skipped++; continue; }

      // Normalize date: accepts YYYY-MM-DD or MM/DD/YYYY or DD.MM.YYYY
      let date = dateRaw.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [m, d, y] = date.split("/");
        date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
        const [d, m, y] = date.split(".");
        date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; continue; }

      const calories = num(findCol(row, ["energy", "calories", "kcal", "kalor"]));
      const protein = num(findCol(row, ["protein"]));
      const carbs = num(findCol(row, ["carbohydrate", "carbs", "kohlenhydrat"]));
      const fat = num(findCol(row, ["fat", "fett"]));
      const fiber = num(findCol(row, ["fiber", "fibre", "ballaststoff"]));
      const weight = num(findCol(row, ["weight", "scale weight", "gewicht"]));

      let rowImported = false;

      // Import nutrition data (daily summary row)
      if (calories !== null && protein !== null) {
        const existing = await dbGet<{ id: number }>(
          "SELECT id FROM food_log WHERE date = ? AND meal_type = 'macrofactor_import'",
          [date]
        );
        if (existing) {
          await dbRun(
            "UPDATE food_log SET calories=?, protein=?, carbs=?, fat=?, fiber=? WHERE id=?",
            [calories, protein ?? 0, carbs ?? 0, fat ?? 0, fiber ?? 0, existing.id]
          );
        } else {
          await dbRun(
            `INSERT INTO food_log (date, meal_type, food_name, calories, protein, carbs, fat, fiber)
             VALUES (?, 'macrofactor_import', 'MacroFactor Daily Total', ?, ?, ?, ?, ?)`,
            [date, calories, protein ?? 0, carbs ?? 0, fat ?? 0, fiber ?? 0]
          );
        }
        rowImported = true;
      }

      // Import body weight into body_metrics
      if (weight !== null) {
        const existing = await dbGet<{ id: number }>(
          "SELECT id FROM body_metrics WHERE date = ?",
          [date]
        );
        if (existing) {
          await dbRun("UPDATE body_metrics SET weight=? WHERE id=?", [weight, existing.id]);
        } else {
          await dbRun("INSERT INTO body_metrics (date, weight) VALUES (?, ?)", [date, weight]);
        }
        rowImported = true;
      }

      if (rowImported) imported++; else skipped++;
    }

    return NextResponse.json({ ok: true, imported, skipped, total: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err).replace(/^Error: /, "") }, { status: 500 });
  }
}
