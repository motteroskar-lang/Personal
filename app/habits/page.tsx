"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { todayStr, formatDate } from "@/lib/utils";

interface Habit {
  id: number;
  name: string;
  icon: string;
  color: string;
  category: string;
  time_of_day: string;
  sort_order: number;
  done: boolean;
  streak: number;
  weekData: { date: string; done: boolean }[];
}

const TIME_GROUPS = [
  { key: "morning", label: "🌅 Morning", order: 0 },
  { key: "evening", label: "🌙 Evening", order: 1 },
  { key: "anytime", label: "✦ Anytime", order: 2 },
];

const HABIT_ICONS = ["💪", "🧘", "📚", "🏃", "💧", "🥗", "😴", "🧠", "🌞", "❄️", "🎯", "✍️", "🎵", "🙏", "💊", "🚴", "🏊", "🧹", "📵", "☕", "🍎", "🫁"];
const HABIT_COLORS = ["#6BE3A4", "#F2C063", "#FF6B6B", "#60A5FA", "#A78BFA", "#FB923C", "#34D399", "#F472B6", "#FBBF24", "#38BDF8"];
const CATEGORIES = [
  { value: "health", label: "❤️ Health" },
  { value: "fitness", label: "💪 Fitness" },
  { value: "mindfulness", label: "🧘 Mindfulness" },
  { value: "learning", label: "📚 Learning" },
  { value: "nutrition", label: "🥗 Nutrition" },
  { value: "productivity", label: "🎯 Productivity" },
  { value: "social", label: "👥 Social" },
];
const TIME_OPTIONS = [
  { value: "morning", label: "🌅 Morning" },
  { value: "evening", label: "🌙 Evening" },
  { value: "anytime", label: "✦ Anytime" },
];

const DEFAULT_HABITS = [
  { name: "Morning workout", icon: "💪", color: "#6BE3A4", category: "fitness", time_of_day: "morning" },
  { name: "Cold shower", icon: "❄️", color: "#60A5FA", category: "health", time_of_day: "morning" },
  { name: "Read 30 min", icon: "📚", color: "#A78BFA", category: "learning", time_of_day: "evening" },
  { name: "No phone 1h before bed", icon: "📵", color: "#F2C063", category: "health", time_of_day: "evening" },
  { name: "Drink 2.5L water", icon: "💧", color: "#38BDF8", category: "nutrition", time_of_day: "anytime" },
  { name: "Meditation 10 min", icon: "🧘", color: "#F472B6", category: "mindfulness", time_of_day: "morning" },
];

export default function HabitsPage() {
  const today = todayStr();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState({ total: 0, done: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [addingDefaults, setAddingDefaults] = useState(false);
  const [form, setForm] = useState({
    name: "", icon: "✓", color: "#6BE3A4", category: "health", time_of_day: "morning",
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/habits?date=${today}&history=true`);
    const data = await res.json();
    setHabits(data.habits ?? []);
    setStats(data.stats ?? { total: 0, done: 0 });
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const toggleHabit = async (habit: Habit) => {
    // Optimistic update
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, done: !h.done, streak: !h.done ? h.streak + 1 : Math.max(0, h.streak - 1) } : h));
    setStats(prev => ({ ...prev, done: habit.done ? prev.done - 1 : prev.done + 1 }));
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "log", habit_id: habit.id, date: today, done: !habit.done }),
    });
  };

  const saveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const method = editHabit ? "PATCH" : "POST";
      const body = editHabit ? { id: editHabit.id, ...form } : form;
      const res = await fetch("/api/habits", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
      setModalOpen(false);
      setEditHabit(null);
      setForm({ name: "", icon: "✓", color: "#6BE3A4", category: "health", time_of_day: "morning" });
      await load();
    } catch (err) { setApiError(String(err).replace("Error: ", "")); }
  };

  const deleteHabit = async (id: number) => {
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
    await load();
  };

  const openEdit = (habit: Habit) => {
    setEditHabit(habit);
    setForm({ name: habit.name, icon: habit.icon, color: habit.color, category: habit.category, time_of_day: habit.time_of_day });
    setModalOpen(true);
  };

  const addDefaultHabits = async () => {
    setAddingDefaults(true);
    for (const h of DEFAULT_HABITS) {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(h),
      });
    }
    setAddingDefaults(false);
    await load();
  };

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const byGroup = TIME_GROUPS.map(g => ({
    ...g,
    habits: habits.filter(h => h.time_of_day === g.key),
  })).filter(g => g.habits.length > 0);

  // 28-day calendar (last 4 weeks)
  const today28: { date: string; label: string }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    today28.push({ date: d.toISOString().split("T")[0], label: d.getDate().toString() });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Daily Habit Tracker</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Habits</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditHabit(null); setForm({ name: "", icon: "✓", color: "#6BE3A4", category: "health", time_of_day: "morning" }); setModalOpen(true); }}>
          + Add Habit
        </Button>
      </div>

      {/* Today's progress ring */}
      <Card>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative w-[100px] h-[100px] flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle cx="40" cy="40" r="32" fill="none"
                stroke={pct === 100 ? "#6BE3A4" : pct >= 50 ? "#F2C063" : "#FF6B6B"}
                strokeWidth="7" strokeLinecap="round"
                transform="rotate(-90 40 40)"
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={2 * Math.PI * 32 * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.3s" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold font-mono">{pct}%</div>
            </div>
          </div>
          <div>
            <div className="text-xl font-bold">{stats.done} / {stats.total} completed</div>
            <div className="text-sm text-[#76746E] mt-1">{formatDate(today, "EEEE, MMMM d")}</div>
            {pct === 100 && <div className="text-sm text-[#6BE3A4] mt-1 font-medium">🔥 Perfect day!</div>}
            {pct === 0 && stats.total > 0 && <div className="text-sm text-[#76746E] mt-1">Start your day strong</div>}
          </div>
        </div>
      </Card>

      {/* No habits yet */}
      {habits.length === 0 && (
        <Card>
          <div className="text-center py-10 text-[#76746E]">
            <div className="text-5xl mb-3">🔄</div>
            <div className="text-base font-medium text-[#FAFAFA] mb-1">No habits yet</div>
            <div className="text-sm mb-5">Build consistency with daily habits that compound over time.</div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="ghost" size="sm" onClick={addDefaultHabits} loading={addingDefaults}>
                ✨ Add starter habits
              </Button>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
                + Create your own
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Habits by time group */}
      {byGroup.map(group => (
        <div key={group.key}>
          <SectionTitle>{group.label}</SectionTitle>
          <div className="space-y-2">
            {group.habits.map(habit => (
              <div key={habit.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${habit.done ? "bg-white/[0.04] border-white/8" : "bg-white/[0.03] border-white/5 hover:bg-white/[0.05]"}`}>
                {/* Checkbox */}
                <button
                  onClick={() => toggleHabit(habit)}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all text-lg"
                  style={{
                    background: habit.done ? habit.color : "rgba(255,255,255,0.06)",
                    border: `2px solid ${habit.done ? habit.color : "rgba(255,255,255,0.12)"}`,
                    boxShadow: habit.done ? `0 0 12px ${habit.color}40` : "none",
                  }}
                >
                  {habit.done ? "✓" : habit.icon}
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${habit.done ? "line-through text-[#76746E]" : ""}`}>
                    {habit.name}
                  </div>
                  <div className="text-[10px] font-mono text-[#76746E] mt-0.5">{habit.category}</div>
                </div>

                {/* Streak */}
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-xs font-mono font-bold" style={{ color: habit.color }}>
                    🔥 {habit.streak}
                  </div>
                )}

                {/* Mini heatmap — last 14 days */}
                <div className="hidden sm:flex gap-0.5">
                  {habit.weekData.slice(-14).map((d, i) => (
                    <div key={i} className="w-3 h-3 rounded-sm" title={d.date}
                      style={{ background: d.done ? habit.color : "rgba(255,255,255,0.06)", opacity: d.done ? 1 : 0.5 }} />
                  ))}
                </div>

                {/* Edit */}
                <button onClick={() => openEdit(habit)}
                  className="text-[#76746E] hover:text-[#B8B6B0] transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100 text-sm leading-none px-1">
                  ✎
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 28-day heatmap calendar */}
      {habits.length > 0 && (
        <div>
          <SectionTitle>28-Day Overview</SectionTitle>
          <Card className="overflow-x-auto">
            <div className="min-w-[320px]">
              {/* Date row */}
              <div className="flex gap-1 mb-3">
                <div className="w-28 flex-shrink-0" />
                {today28.map((d, i) => (
                  <div key={i} className={`flex-1 text-center text-[8px] font-mono ${d.date === today ? "text-[#6BE3A4] font-bold" : "text-[#76746E]"}`}>
                    {i % 3 === 0 ? d.label : ""}
                  </div>
                ))}
              </div>
              {/* Habit rows */}
              {habits.map(habit => (
                <div key={habit.id} className="flex items-center gap-1 mb-1.5">
                  <div className="w-28 flex-shrink-0 text-xs font-mono text-[#76746E] truncate pr-2">{habit.icon} {habit.name}</div>
                  {today28.map((d, i) => {
                    const wd = habit.weekData.find(w => w.date === d.date);
                    return (
                      <div key={i} className="flex-1 h-4 rounded-sm"
                        style={{ background: wd?.done ? habit.color : "rgba(255,255,255,0.05)", opacity: wd?.done ? 0.9 : 1 }}
                        title={`${habit.name} — ${d.date}`} />
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setApiError(null); setEditHabit(null); }} title={editHabit ? "Edit Habit" : "Add Habit"}>
        <form onSubmit={saveHabit} className="space-y-4">
          {apiError && <div className="px-3 py-2 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs">{apiError}</div>}

          <Input label="Habit Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Morning workout" required />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Time of Day" value={form.time_of_day}
              onChange={e => setForm(p => ({ ...p, time_of_day: e.target.value }))} options={TIME_OPTIONS} />
            <Select label="Category" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={CATEGORIES} />
          </div>

          {/* Icon picker */}
          <div>
            <div className="text-[10.5px] font-mono font-bold uppercase tracking-[0.12em] text-[#76746E] mb-2">Icon</div>
            <div className="flex gap-2 flex-wrap">
              {HABIT_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setForm(p => ({ ...p, icon }))}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${form.icon === icon ? "bg-white/15 border border-white/25" : "bg-white/[0.04] border border-white/8 hover:bg-white/10"}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div className="text-[10.5px] font-mono font-bold uppercase tracking-[0.12em] text-[#76746E] mb-2">Color</div>
            <div className="flex gap-2 flex-wrap">
              {HABIT_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm(p => ({ ...p, color }))}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    background: color,
                    borderColor: form.color === color ? "white" : "transparent",
                    boxShadow: form.color === color ? `0 0 8px ${color}80` : "none",
                  }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-between pt-2">
            {editHabit && (
              <Button variant="ghost" type="button" onClick={() => { deleteHabit(editHabit.id); setModalOpen(false); }}
                className="text-[#FF6B6B]">
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit">{editHabit ? "Save" : "Add Habit"}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
