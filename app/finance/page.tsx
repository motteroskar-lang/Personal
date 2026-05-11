"use client";

import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from "recharts";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { todayStr, formatDate, progressPercent, SPENDING_CATEGORIES } from "@/lib/utils";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  account: string;
  type: string;
}

interface FinancialGoal {
  id: number;
  name: string;
  target: number;
  current: number;
  currency: string;
  deadline?: string;
  category: string;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  byCategory: Record<string, number>;
  transactions: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#F2C063", transport: "#60A5FA", entertainment: "#A78BFA",
  shopping: "#FB923C", health: "#6BE3A4", subscriptions: "#EC4899",
  utilities: "#94A3B8", rent: "#F87171", savings: "#34D399",
  investment: "#818CF8", fitness: "#6BE3A4", travel: "#FBBF24",
  education: "#60A5FA", other: "#76746E",
};

const CATEGORY_OPTS = SPENDING_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
const ACCOUNT_OPTS = [
  { value: "revolut", label: "Revolut" },
  { value: "scalable", label: "Scalable Capital" },
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export default function FinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [days, setDays] = useState(30);
  const [modalOpen, setModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importAccount, setImportAccount] = useState("revolut");
  const [form, setForm] = useState({ date: todayStr(), description: "", amount: "", currency: "EUR", category: "food", account: "revolut", txtype: "expense" });
  const [goalForm, setGoalForm] = useState({ name: "", target: "", currency: "EUR", deadline: "", category: "savings" });
  const [txError, setTxError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sumRes, goalRes] = await Promise.all([
      fetch(`/api/finance?type=summary&days=${days}`),
      fetch("/api/finance?type=goals"),
    ]);
    const sumData = await sumRes.json();
    const goalData = await goalRes.json();
    setSummary(sumData);
    setGoals(goalData.goals ?? []);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
      setModalOpen(false);
      setForm({ date: todayStr(), description: "", amount: "", currency: "EUR", category: "food", account: "revolut", txtype: "expense" });
      await load();
    } catch (err) { setTxError(String(err).replace("Error: ", "")); }
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError(null);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "financial_goal", ...goalForm, target: parseFloat(goalForm.target) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
      setGoalModalOpen(false);
      await load();
    } catch (err) { setGoalError(String(err).replace("Error: ", "")); }
  };

  const importCSV = async () => {
    if (!csvText.trim()) return;
    setImportError(null);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "import_csv", csv: csvText, account: importAccount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
      setImportModalOpen(false);
      setCsvText("");
      await load();
    } catch (err) { setImportError(String(err).replace("Error: ", "")); }
  };

  const deleteTransaction = async (id: number) => {
    await fetch(`/api/finance?id=${id}`, { method: "DELETE" });
    await load();
  };

  const pieData = Object.entries(summary?.byCategory ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, val]) => ({ name: cat, value: Math.round(val) }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Revolut · Scalable Capital</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Finance</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`text-xs font-mono px-2 py-1 rounded-lg transition-colors ${days === d ? "bg-white/10 text-[#FAFAFA]" : "text-[#76746E] hover:text-[#B8B6B0]"}`}>
              {d}d
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(true)}>📥 Import CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => setGoalModalOpen(true)}>+ Goal</Button>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ Transaction</Button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Income", value: `€${Math.round(summary.totalIncome).toLocaleString()}`, color: "#6BE3A4", icon: "📈" },
            { label: "Expenses", value: `€${Math.round(summary.totalExpense).toLocaleString()}`, color: "#FF6B6B", icon: "📉" },
            { label: "Net Savings", value: `€${Math.round(summary.netSavings).toLocaleString()}`, color: summary.netSavings >= 0 ? "#6BE3A4" : "#FF6B6B", icon: "💰" },
            { label: "Savings Rate", value: `${summary.savingsRate}%`, color: summary.savingsRate >= 20 ? "#6BE3A4" : summary.savingsRate >= 10 ? "#F2C063" : "#FF6B6B", icon: "📊" },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spending breakdown */}
        {pieData.length > 0 && (
          <Card>
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-4">Spending by Category</div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.name] ?? "#76746E"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0A0A0B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {pieData.slice(0, 6).map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[item.name] ?? "#76746E" }} />
                    <span className="text-xs text-[#B8B6B0] flex-1">{item.name}</span>
                    <span className="text-xs font-mono font-bold">€{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Financial goals */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#76746E]">Financial Goals</div>
            <button onClick={() => setGoalModalOpen(true)} className="text-xs text-[#6BE3A4] hover:underline">+ Add</button>
          </div>
          {goals.length === 0 ? (
            <div className="text-center py-6 text-[#76746E] text-sm">No financial goals yet.</div>
          ) : (
            <div className="space-y-4">
              {goals.map(g => {
                const pct = progressPercent(g.current, g.target);
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-sm font-medium">{g.name}</div>
                      <div className="text-xs font-mono text-[#6BE3A4] font-bold">{pct}%</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#6BE3A4" }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-mono text-[#76746E]">{g.currency}{g.current.toLocaleString()} / {g.currency}{g.target.toLocaleString()}</span>
                      {g.deadline && <span className="text-[10px] font-mono text-[#76746E]">by {formatDate(g.deadline, "MMM yyyy")}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Transaction list */}
      <div>
        <SectionTitle>Recent Transactions</SectionTitle>
        {!summary?.transactions?.length ? (
          <Card>
            <div className="text-center py-8 text-[#76746E]">
              <div className="text-4xl mb-2">💳</div>
              <div className="text-sm mb-3">No transactions yet. Import from Revolut or add manually.</div>
              <div className="flex gap-2 justify-center">
                <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(true)}>📥 Import CSV</Button>
                <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ Add Transaction</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="space-y-1">
              {summary.transactions.slice(0, 30).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] group transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[tx.category] ?? "#76746E" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{tx.description}</div>
                    <div className="text-[10px] font-mono text-[#76746E]">{formatDate(tx.date)} · {tx.category} · {tx.account}</div>
                  </div>
                  <div className={`text-sm font-bold font-mono ${tx.type === "income" ? "text-[#6BE3A4]" : "text-[#FAFAFA]"}`}>
                    {tx.type === "income" ? "+" : "-"}{tx.currency === "EUR" ? "€" : tx.currency}{tx.amount.toFixed(2)}
                  </div>
                  <button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-[#FF6B6B] text-lg leading-none transition-opacity">×</button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setTxError(null); }} title="Add Transaction">
        <form onSubmit={addTransaction} className="space-y-4">
          {txError && <div className="px-3 py-2 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs">{txError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <Select label="Type" value={form.txtype} onChange={e => setForm(p => ({ ...p, txtype: e.target.value }))}
              options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} />
          </div>
          <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Groceries" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" required />
            <Select label="Currency" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              options={[{ value: "EUR", label: "EUR €" }, { value: "USD", label: "USD $" }, { value: "GBP", label: "GBP £" }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={CATEGORY_OPTS} />
            <Select label="Account" value={form.account} onChange={e => setForm(p => ({ ...p, account: e.target.value }))} options={ACCOUNT_OPTS} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      {/* Add Goal Modal */}
      <Modal open={goalModalOpen} onClose={() => { setGoalModalOpen(false); setGoalError(null); }} title="Add Financial Goal">
        <form onSubmit={addGoal} className="space-y-4">
          {goalError && <div className="px-3 py-2 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs">{goalError}</div>}
          <Input label="Goal Name" value={goalForm.name} onChange={e => setGoalForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Emergency Fund" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Amount" type="number" step="0.01" value={goalForm.target} onChange={e => setGoalForm(p => ({ ...p, target: e.target.value }))} required />
            <Select label="Currency" value={goalForm.currency} onChange={e => setGoalForm(p => ({ ...p, currency: e.target.value }))}
              options={[{ value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }, { value: "GBP", label: "GBP" }]} />
          </div>
          <Input label="Target Date" type="date" value={goalForm.deadline} onChange={e => setGoalForm(p => ({ ...p, deadline: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setGoalModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Goal</Button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={importModalOpen} onClose={() => { setImportModalOpen(false); setImportError(null); }} title="Import CSV">
        <div className="space-y-4">
          {importError && <div className="px-3 py-2 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs">{importError}</div>}
          <Select label="Account" value={importAccount} onChange={e => setImportAccount(e.target.value)} options={ACCOUNT_OPTS} />
          <Textarea label="Paste CSV data (Revolut export format)" value={csvText} onChange={e => setCsvText(e.target.value)} rows={6} placeholder="Date,Description,Amount,Currency..." />
          <p className="text-xs text-[#76746E]">Export from Revolut: Profile → Statements → CSV. For Scalable Capital, export transaction history as CSV.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setImportModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={importCSV} disabled={!csvText.trim()}>Import</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
