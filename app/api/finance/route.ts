import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { todayStr, parseRevolutCSV } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const type = searchParams.get("type") ?? "transactions";

  if (type === "goals") {
    const goals = db.prepare("SELECT * FROM financial_goals ORDER BY deadline ASC").all();
    return NextResponse.json({ goals });
  }

  if (type === "summary") {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split("T")[0];

    const transactions = db.prepare(
      "SELECT * FROM finance_transactions WHERE date >= ? ORDER BY date DESC"
    ).all(startStr);

    const totalIncome = (transactions as Array<{ type: string; amount: number }>)
      .filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = (transactions as Array<{ type: string; amount: number }>)
      .filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const byCategory = (transactions as Array<{ type: string; category: string; amount: number }>)
      .filter(t => t.type === "expense")
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

  const transactions = db.prepare(
    "SELECT * FROM finance_transactions ORDER BY date DESC LIMIT ?"
  ).all(days);
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  if (body.type === "import_csv") {
    const { csv, account } = body;
    const parsed = parseRevolutCSV(csv);
    const insert = db.prepare(
      "INSERT INTO finance_transactions (date, description, amount, currency, type, account, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    let count = 0;
    for (const t of parsed) {
      insert.run(t.date, t.description, t.amount, t.currency, t.type, account ?? "revolut", "other");
      count++;
    }
    return NextResponse.json({ imported: count });
  }

  if (body.type === "financial_goal") {
    const { name, target, currency, deadline, category } = body;
    const result = db.prepare(
      "INSERT INTO financial_goals (name, target, currency, deadline, category) VALUES (?, ?, ?, ?, ?)"
    ).run(name, target, currency ?? "EUR", deadline ?? null, category ?? "savings");
    const goal = db.prepare("SELECT * FROM financial_goals WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ goal });
  }

  if (body.type === "update_financial_goal") {
    const { id, current } = body;
    db.prepare("UPDATE financial_goals SET current = ?, updated_at = unixepoch() WHERE id = ?").run(current, id);
    return NextResponse.json({ ok: true });
  }

  const { date, description, amount, currency, category, account, txtype } = body;
  const result = db.prepare(
    "INSERT INTO finance_transactions (date, description, amount, currency, category, account, type) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    date ?? todayStr(), description, amount,
    currency ?? "EUR", category ?? "other",
    account ?? "revolut", txtype ?? "expense"
  );
  const transaction = db.prepare("SELECT * FROM finance_transactions WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ transaction });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "transaction";

  if (type === "goal") {
    db.prepare("DELETE FROM financial_goals WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM finance_transactions WHERE id = ?").run(id);
  }
  return NextResponse.json({ ok: true });
}
