import { NextRequest, NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, initSchema } from "@/lib/db";
import { todayStr, parseRevolutCSV } from "@/lib/utils";

export async function GET(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const type = searchParams.get("type") ?? "transactions";

  if (type === "goals") {
    const goals = await dbAll("SELECT * FROM financial_goals ORDER BY deadline ASC");
    return NextResponse.json({ goals });
  }

  if (type === "summary") {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split("T")[0];

    const transactions = await dbAll<{ type: string; amount: number; category: string }>(
      "SELECT * FROM finance_transactions WHERE date >= ? ORDER BY date DESC",
      [startStr]
    );

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const byCategory = transactions
      .filter((t) => t.type === "expense")
      .reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});

    return NextResponse.json({
      transactions,
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? Math.round((1 - totalExpense / totalIncome) * 100) : 0,
      byCategory,
    });
  }

  const transactions = await dbAll("SELECT * FROM finance_transactions ORDER BY date DESC LIMIT ?", [days]);
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  await initSchema();
  const body = await req.json();

  if (body.type === "import_csv") {
    const { csv, account } = body;
    const parsed = parseRevolutCSV(csv);
    let count = 0;
    for (const t of parsed) {
      await dbRun(
        "INSERT INTO finance_transactions (date, description, amount, currency, type, account, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [t.date, t.description, t.amount, t.currency, t.type, account ?? "revolut", "other"]
      );
      count++;
    }
    return NextResponse.json({ imported: count });
  }

  if (body.type === "financial_goal") {
    const { name, target, currency, deadline, category } = body;
    const r = await dbRun(
      "INSERT INTO financial_goals (name, target, currency, deadline, category) VALUES (?, ?, ?, ?, ?)",
      [name, target, currency ?? "EUR", deadline ?? null, category ?? "savings"]
    );
    const goal = await dbGet("SELECT * FROM financial_goals WHERE id = ?", [r.lastInsertRowid]);
    return NextResponse.json({ goal });
  }

  if (body.type === "update_financial_goal") {
    const { id, current } = body;
    await dbRun("UPDATE financial_goals SET current = ?, updated_at = unixepoch() WHERE id = ?", [current, id]);
    return NextResponse.json({ ok: true });
  }

  const { date, description, amount, currency, category, account, txtype } = body;
  const r = await dbRun(
    "INSERT INTO finance_transactions (date, description, amount, currency, category, account, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [date ?? todayStr(), description, amount, currency ?? "EUR", category ?? "other", account ?? "revolut", txtype ?? "expense"]
  );
  const transaction = await dbGet("SELECT * FROM finance_transactions WHERE id = ?", [r.lastInsertRowid]);
  return NextResponse.json({ transaction });
}

export async function DELETE(req: NextRequest) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "transaction";

  if (type === "goal") {
    await dbRun("DELETE FROM financial_goals WHERE id = ?", [id]);
  } else {
    await dbRun("DELETE FROM finance_transactions WHERE id = ?", [id]);
  }
  return NextResponse.json({ ok: true });
}
