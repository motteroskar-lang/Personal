"use client";

import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { todayStr, formatDate } from "@/lib/utils";

interface FoodEntry { id: number; date: string; meal_type: string; food_name: string; amount?: number; unit?: string; calories: number; protein: number; carbs: number; fat: number }
interface NutritionGoals { calories: number; protein: number; carbs: number; fat: number }
interface Totals { calories: number; protein: number; carbs: number; fat: number }

const MEAL_TYPES = [
  { value: "breakfast", label: "🌅 Breakfast" },
  { value: "lunch", label: "☀️ Lunch" },
  { value: "dinner", label: "🌙 Dinner" },
  { value: "snack", label: "🍎 Snack" },
  { value: "pre_workout", label: "💪 Pre-Workout" },
  { value: "post_workout", label: "🔄 Post-Workout" },
];

const MACRO_COLORS = { protein: "#6BE3A4", carbs: "#F2C063", fat: "#FF6B6B" };

function MacroRing({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const C = 2 * Math.PI * 32;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[80px] h-[80px]">
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            transform="rotate(-90 40 40)" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-base font-bold font-mono">{pct}%</div>
        </div>
      </div>
      <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#76746E]">{label}</div>
      <div className="text-xs font-mono" style={{ color }}>{Math.round(current)}g <span className="text-[#76746E]">/ {goal}g</span></div>
    </div>
  );
}

export default function NutritionPage() {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState<NutritionGoals>({ calories: 2500, protein: 180, carbs: 250, fat: 80 });
  const [modalOpen, setModalOpen] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goalsForm, setGoalsForm] = useState({ calories: "2500", protein: "180", carbs: "250", fat: "80" });
  const [form, setForm] = useState({ meal_type: "lunch", food_name: "", amount: "", unit: "g", calories: "", protein: "", carbs: "", fat: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/nutrition?date=${date}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setTotals(data.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 });
    if (data.goals) setGoals(data.goals);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, ...form, calories: parseFloat(form.calories) || 0, protein: parseFloat(form.protein) || 0, carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0, amount: form.amount ? parseFloat(form.amount) : undefined }),
    });
    setModalOpen(false);
    setForm({ meal_type: "lunch", food_name: "", amount: "", unit: "g", calories: "", protein: "", carbs: "", fat: "" });
    await load();
  };

  const deleteEntry = async (id: number) => {
    await fetch(`/api/nutrition?id=${id}`, { method: "DELETE" });
    await load();
  };

  const saveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "goals", ...Object.fromEntries(Object.entries(goalsForm).map(([k, v]) => [k, parseInt(v)])) }),
    });
    setGoalsModalOpen(false);
    await load();
  };

  const calPct = Math.min(100, Math.round((totals.calories / goals.calories) * 100));
  const calRemaining = Math.max(0, goals.calories - totals.calories);

  const byMeal = MEAL_TYPES.reduce((acc, m) => {
    acc[m.value] = entries.filter(e => e.meal_type === m.value);
    return acc;
  }, {} as Record<string, FoodEntry[]>);

  const pieData = [
    { name: "Protein", value: Math.round(totals.protein * 4), color: MACRO_COLORS.protein },
    { name: "Carbs", value: Math.round(totals.carbs * 4), color: MACRO_COLORS.carbs },
    { name: "Fat", value: Math.round(totals.fat * 9), color: MACRO_COLORS.fat },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Calorie & Macro Tracker</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Nutrition</h1>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] outline-none focus:border-white/22" />
          <Button variant="ghost" size="sm" onClick={() => { setGoalsForm({ calories: goals.calories.toString(), protein: goals.protein.toString(), carbs: goals.carbs.toString(), fat: goals.fat.toString() }); setGoalsModalOpen(true); }}>⚙️ Goals</Button>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ Add Food</Button>
        </div>
      </div>

      {/* Calorie ring + macros */}
      <Card>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Calorie ring */}
          <div className="relative w-[140px] h-[140px] flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={calPct >= 100 ? "#FF6B6B" : "#F2C063"} strokeWidth="8" strokeLinecap="round"
                transform="rotate(-90 60 60)"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - calPct / 100)}
                style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.3s" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold font-mono">{Math.round(totals.calories)}</div>
              <div className="text-[9.5px] font-mono uppercase tracking-[0.12em] text-[#76746E]">kcal eaten</div>
              <div className="text-[10px] font-mono text-[#B8B6B0] mt-0.5">{calRemaining} left</div>
            </div>
          </div>

          {/* Macro rings */}
          <div className="flex gap-6 flex-wrap">
            <MacroRing label="Protein" current={totals.protein} goal={goals.protein} color={MACRO_COLORS.protein} />
            <MacroRing label="Carbs" current={totals.carbs} goal={goals.carbs} color={MACRO_COLORS.carbs} />
            <MacroRing label="Fat" current={totals.fat} goal={goals.fat} color={MACRO_COLORS.fat} />
          </div>

          {/* Macro pie */}
          {pieData.length > 0 && (
            <div className="flex-1 min-w-[140px]">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0A0A0B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      {/* Food log by meal */}
      <div className="space-y-4">
        {MEAL_TYPES.map(meal => {
          const mealEntries = byMeal[meal.value] ?? [];
          const mealCal = mealEntries.reduce((s, e) => s + e.calories, 0);
          if (mealEntries.length === 0) return null;

          return (
            <div key={meal.value}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#76746E]">
                  {meal.label} — {Math.round(mealCal)} kcal
                </div>
              </div>
              <div className="space-y-1">
                {mealEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.035] border border-white/6 group hover:bg-white/[0.055] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{entry.food_name} {entry.amount ? `(${entry.amount}${entry.unit})` : ""}</div>
                      <div className="text-xs font-mono text-[#76746E]">
                        P: {Math.round(entry.protein)}g · C: {Math.round(entry.carbs)}g · F: {Math.round(entry.fat)}g
                      </div>
                    </div>
                    <div className="text-sm font-bold font-mono text-[#F2C063]">{Math.round(entry.calories)}</div>
                    <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[#FF6B6B] text-lg leading-none transition-opacity">×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <Card>
            <div className="text-center py-8 text-[#76746E]">
              <div className="text-4xl mb-2">🥗</div>
              <div className="text-sm mb-3">Nothing logged for {date === today ? "today" : formatDate(date)} yet.</div>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ Add First Meal</Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add food modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Food Entry">
        <form onSubmit={addEntry} className="space-y-4">
          <Select label="Meal" value={form.meal_type} onChange={e => setForm(p => ({ ...p, meal_type: e.target.value }))} options={MEAL_TYPES} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Food Name" value={form.food_name} onChange={e => setForm(p => ({ ...p, food_name: e.target.value }))} placeholder="e.g. Chicken breast" required />
            </div>
            <Input label="Amount" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calories" type="number" step="0.1" value={form.calories} onChange={e => setForm(p => ({ ...p, calories: e.target.value }))} placeholder="0" required />
            <Input label="Protein (g)" type="number" step="0.1" value={form.protein} onChange={e => setForm(p => ({ ...p, protein: e.target.value }))} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Carbs (g)" type="number" step="0.1" value={form.carbs} onChange={e => setForm(p => ({ ...p, carbs: e.target.value }))} placeholder="0" />
            <Input label="Fat (g)" type="number" step="0.1" value={form.fat} onChange={e => setForm(p => ({ ...p, fat: e.target.value }))} placeholder="0" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Food</Button>
          </div>
        </form>
      </Modal>

      {/* Goals modal */}
      <Modal open={goalsModalOpen} onClose={() => setGoalsModalOpen(false)} title="Daily Nutrition Goals">
        <form onSubmit={saveGoals} className="space-y-4">
          <Input label="Daily Calories" type="number" value={goalsForm.calories} onChange={e => setGoalsForm(p => ({ ...p, calories: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Protein (g)" type="number" value={goalsForm.protein} onChange={e => setGoalsForm(p => ({ ...p, protein: e.target.value }))} />
            <Input label="Carbs (g)" type="number" value={goalsForm.carbs} onChange={e => setGoalsForm(p => ({ ...p, carbs: e.target.value }))} />
            <Input label="Fat (g)" type="number" value={goalsForm.fat} onChange={e => setGoalsForm(p => ({ ...p, fat: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setGoalsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Goals</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
