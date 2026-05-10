"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, UrgencyBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { todayStr, formatDate, categoryIcon, categoryColor, daysUntil, progressPercent } from "@/lib/utils";

interface Goal {
  id: number;
  title: string;
  description?: string;
  category: string;
  urgency: string;
  status: string;
  current_value?: number;
  target_value?: number;
  unit?: string;
  deadline?: string;
  created_at: number;
}

interface DailyTask {
  id: number;
  text: string;
  done: boolean;
  ai_generated: boolean;
  queued: boolean;
}

interface Streak { type: string; current_count: number; longest_count: number }

const CATEGORIES = [
  { value: "fitness", label: "💪 Fitness" },
  { value: "nutrition", label: "🥗 Nutrition" },
  { value: "health", label: "❤️ Health" },
  { value: "learning", label: "📚 Learning" },
  { value: "financial", label: "💰 Financial" },
  { value: "personal", label: "🎯 Personal" },
  { value: "discipline", label: "🔥 Discipline" },
];

const URGENCIES = [
  { value: "critical", label: "🔴 Critical" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "⚪ Low" },
];

export default function GoalsPage() {
  const today = todayStr();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<string>("all");

  // New goal form
  const [form, setForm] = useState({
    title: "", description: "", category: "fitness", urgency: "medium",
    target_value: "", unit: "", deadline: "",
  });

  const load = useCallback(async () => {
    const [goalsRes, tasksRes, streaksRes] = await Promise.all([
      fetch("/api/goals"),
      fetch(`/api/goals?type=daily&date=${today}`),
      fetch("/api/health?days=0").catch(() => ({ json: async () => ({}) })),
    ]);
    const goalsData = await goalsRes.json();
    const tasksData = await tasksRes.json();

    // Load streaks from DB directly
    const r = await fetch("/api/settings");
    const settings = await r.json();

    setGoals(goalsData.goals ?? []);
    setTasks(tasksData.tasks ?? []);
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editGoal ? "PATCH" : "POST";
    const body = editGoal
      ? { id: editGoal.id, ...form, target_value: form.target_value ? parseFloat(form.target_value) : undefined }
      : { ...form, target_value: form.target_value ? parseFloat(form.target_value) : undefined };

    await fetch("/api/goals", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setModalOpen(false);
    setEditGoal(null);
    setForm({ title: "", description: "", category: "fitness", urgency: "medium", target_value: "", unit: "", deadline: "" });
    await load();
  };

  const deleteGoal = async (id: number) => {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
    await load();
  };

  const archiveGoal = async (id: number) => {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed" }),
    });
    await load();
  };

  const updateProgress = async (goal: Goal, delta: number) => {
    const newVal = (goal.current_value ?? 0) + delta;
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goal.id, current_value: Math.max(0, newVal) }),
    });
    await load();
  };

  const toggleTask = async (task: DailyTask) => {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, type: "daily", done: !task.done }),
    });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = async (id: number) => {
    await fetch(`/api/goals?id=${id}&type=daily`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "daily", date: today, text: newTask.trim() }),
    });
    const data = await res.json();
    setTasks(prev => [...prev, data.task]);
    setNewTask("");
  };

  const generatePlan = async () => {
    setGeneratingPlan(true);
    try {
      const res = await fetch("/api/ai/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (res.ok) await load();
    } finally {
      setGeneratingPlan(false);
    }
  };

  const openAddGoal = () => {
    setEditGoal(null);
    setForm({ title: "", description: "", category: "fitness", urgency: "medium", target_value: "", unit: "", deadline: "" });
    setModalOpen(true);
  };

  const openEditGoal = (g: Goal) => {
    setEditGoal(g);
    setForm({
      title: g.title, description: g.description ?? "", category: g.category,
      urgency: g.urgency, target_value: g.target_value?.toString() ?? "",
      unit: g.unit ?? "", deadline: g.deadline ?? "",
    });
    setModalOpen(true);
  };

  const filteredGoals = goals.filter(g =>
    filter === "all" || g.urgency === filter || g.category === filter
  );

  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedGoals = [...filteredGoals].sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3));

  const doneTasks = tasks.filter(t => t.done).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">
            {formatDate(today, "EEEE, MMMM d")}
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Goals</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={generatePlan} loading={generatingPlan}>
            🤖 AI Daily Plan
          </Button>
          <Button variant="primary" size="sm" onClick={openAddGoal}>
            + Add Goal
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Goals", value: goals.length, icon: "🎯", color: "#FAFAFA" },
          { label: "Critical/High", value: goals.filter(g => g.urgency === "critical" || g.urgency === "high").length, icon: "🔥", color: "#FF6B6B" },
          { label: "Today Done", value: `${doneTasks}/${tasks.length}`, icon: "✅", color: "#6BE3A4" },
        ].map(stat => (
          <Card key={stat.label} className="text-center py-4">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#76746E] mt-0.5">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Today's daily plan */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Today&rsquo;s Action Plan — {formatDate(today)}</SectionTitle>
        </div>
        <Card>
          {tasks.length > 0 && (
            <div className="flex gap-1 mb-4 h-1.5">
              {tasks.map(t => (
                <div key={t.id} className="flex-1 rounded-full transition-all"
                  style={{ background: t.done ? "#6BE3A4" : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
          )}
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-[#76746E]">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm mb-3">No tasks yet. Generate an AI plan or add manually.</div>
              <Button variant="secondary" size="sm" onClick={generatePlan} loading={generatingPlan}>
                🤖 Generate AI Daily Plan
              </Button>
            </div>
          ) : (
            <ul className="space-y-2 mb-4">
              {tasks.map(task => (
                <li key={task.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors group ${task.done ? "opacity-50 bg-[#6BE3A4]/[0.03] border-white/4" : task.queued ? "bg-[#F2C063]/[0.06] border-[#F2C063]/20" : "bg-white/[0.035] border-white/6 hover:bg-white/[0.06]"}`}>
                  <label className="custom-cb">
                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} />
                    <span className="custom-cb-box" />
                  </label>
                  <span className={`flex-1 text-sm ${task.done ? "line-through text-[#76746E]" : ""}`}>{task.text}</span>
                  {task.ai_generated && <Badge variant="default">AI</Badge>}
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[#FF6B6B] text-lg leading-none transition-opacity">×</button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addTask} className="flex gap-2 pt-3 border-t border-white/6">
            <input
              type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
              placeholder="Add a task for today…"
              className="flex-1 px-3 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] placeholder-[#76746E] outline-none focus:border-white/22"
            />
            <Button type="submit" variant="primary" size="sm">+ Add</Button>
          </form>
        </Card>
      </div>

      {/* Long-term goals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Long-Term Goals</SectionTitle>
          <div className="flex gap-2">
            {["all", "critical", "high", "fitness", "financial", "learning"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${filter === f ? "bg-white/10 text-[#FAFAFA]" : "text-[#76746E] hover:text-[#B8B6B0]"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {sortedGoals.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-[#76746E]">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-sm mb-3">No goals yet. What do you want to achieve?</div>
              <Button variant="primary" size="sm" onClick={openAddGoal}>+ Add First Goal</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedGoals.map(goal => {
              const pct = goal.target_value ? progressPercent(goal.current_value ?? 0, goal.target_value) : null;
              const daysLeft = goal.deadline ? daysUntil(goal.deadline) : null;
              const isUrgent = goal.urgency === "critical" || goal.urgency === "high";

              return (
                <Card key={goal.id} className={isUrgent ? "border-" + (goal.urgency === "critical" ? "[#FF6B6B]" : "[#F2C063]") + "/25" : ""}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{categoryIcon(goal.category)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-[15px]">{goal.title}</h3>
                          {goal.description && <p className="text-xs text-[#76746E] mt-0.5">{goal.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <UrgencyBadge urgency={goal.urgency} />
                          <Badge variant="default">{goal.category}</Badge>
                        </div>
                      </div>

                      {/* Progress */}
                      {goal.target_value && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono text-[#76746E]">
                              {goal.current_value ?? 0} / {goal.target_value} {goal.unit}
                            </span>
                            <span className="text-xs font-mono font-bold" style={{ color: categoryColor(goal.category) }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: categoryColor(goal.category) }} />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => updateProgress(goal, -1)}
                              className="text-xs text-[#76746E] hover:text-[#FAFAFA] w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">−</button>
                            <button onClick={() => updateProgress(goal, 1)}
                              className="text-xs text-[#76746E] hover:text-[#FAFAFA] w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">+</button>
                            <span className="text-[10px] font-mono text-[#76746E]">update progress</span>
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                        {daysLeft !== null && (
                          <span className={`text-xs font-mono ${daysLeft < 7 ? "text-[#FF6B6B]" : daysLeft < 30 ? "text-[#F2C063]" : "text-[#76746E]"}`}>
                            {daysLeft > 0 ? `${daysLeft} days left` : "Overdue!"}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button onClick={() => openEditGoal(goal)}
                          className="text-xs text-[#76746E] hover:text-[#B8B6B0] transition-colors">Edit</button>
                        <button onClick={() => archiveGoal(goal.id)}
                          className="text-xs text-[#6BE3A4] hover:text-[#6BE3A4]/80 transition-colors">Complete</button>
                        <button onClick={() => deleteGoal(goal.id)}
                          className="text-xs text-[#FF6B6B]/60 hover:text-[#FF6B6B] transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Goal Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGoal ? "Edit Goal" : "Add New Goal"}>
        <form onSubmit={saveGoal} className="space-y-4">
          <Input label="Goal Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Bench press 100kg" required />
          <Textarea label="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Why this goal matters…" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} options={CATEGORIES} />
            <Select label="Urgency" value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))} options={URGENCIES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Value" type="number" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} placeholder="100" />
            <Input label="Unit" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="kg, reps, €…" />
          </div>
          <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editGoal ? "Save Changes" : "Add Goal"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
