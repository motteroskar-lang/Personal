"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, UrgencyBadge } from "@/components/ui/Badge";
import { todayStr, formatDate, formatTime, hrvStatus, bodyBatteryColor, categoryIcon } from "@/lib/utils";

interface HealthData {
  sleep_duration_min?: number;
  hrv_avg?: number;
  resting_hr?: number;
  body_battery_start?: number;
  steps?: number;
  stress_avg?: number;
  spo2_avg?: number;
  respiratory_rate?: number;
}

interface Goal {
  id: number;
  title: string;
  category: string;
  urgency: string;
  current_value?: number;
  target_value?: number;
  unit?: string;
  deadline?: string;
}

interface DailyTask {
  id: number;
  text: string;
  done: boolean;
  ai_generated: boolean;
  queued: boolean;
}

interface AIInsight {
  id: number;
  type: string;
  content: string;
  priority: string;
  read: boolean;
}

interface HabitStats { total: number; done: number }
interface WaterData { amount_ml: number; goal_ml: number }
interface NutritionTotals { calories: number; protein: number; carbs: number; fat: number }
interface NutritionGoals { calories: number; protein: number; carbs: number; fat: number }
interface BodyLatest { weight_kg?: number; body_fat_pct?: number; date?: string }

function DayRing() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const WAKE_HOUR = 7, SLEEP_HOUR = 24;
  const hours = time.getHours() + time.getMinutes() / 60;
  const CIRCUMFERENCE = 2 * Math.PI * 52;

  let pct = 0, phase = "SLEEPING", status = "😴 Sleeping";
  let strokeColor = "#4D4B47", strokeOffset = CIRCUMFERENCE;

  if (hours >= WAKE_HOUR && hours < SLEEP_HOUR) {
    pct = Math.min(100, ((hours - WAKE_HOUR) / (SLEEP_HOUR - WAKE_HOUR)) * 100);
    strokeOffset = CIRCUMFERENCE * (1 - pct / 100);

    const colors = [
      [0, [255, 216, 158]], [25, [255, 183, 106]], [50, [255, 149, 89]],
      [75, [226, 93, 122]], [100, [47, 58, 102]],
    ] as [number, number[]][];

    let lo = colors[0], hi = colors[colors.length - 1];
    for (let i = 0; i < colors.length - 1; i++) {
      if (pct >= colors[i][0] && pct <= colors[i + 1][0]) { lo = colors[i]; hi = colors[i + 1]; break; }
    }
    const t = lo[0] === hi[0] ? 0 : (pct - lo[0]) / (hi[0] - lo[0]);
    const [r, g, b] = [0, 1, 2].map(i => Math.round(lo[1][i] + t * (hi[1][i] - lo[1][i])));
    strokeColor = `rgb(${r},${g},${b})`;

    if (pct < 25) { phase = "MORNING"; status = "☀️ Morning — fresh start"; }
    else if (pct < 50) { phase = "MIDDAY"; status = "⚡ Midday — keep moving"; }
    else if (pct < 75) { phase = "AFTERNOON"; status = "🔥 Afternoon — push it"; }
    else if (pct < 90) { phase = "EVENING"; status = "⏳ Evening — wrap up"; }
    else { phase = "BEDTIME"; status = "🌙 Bedtime soon"; }
  }

  const minsLeft = Math.round((SLEEP_HOUR - hours) * 60);
  const fmt12 = (d: Date) => {
    const h = d.getHours(), m = d.getMinutes();
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative w-[160px] h-[160px] flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
            filter="url(#glow)" transform="rotate(-90 60 60)"
            stroke={strokeColor}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.7s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
          <div className="text-4xl font-bold tracking-[-0.04em]">{Math.round(pct)}%</div>
          <div className="text-[9.5px] font-mono font-bold tracking-[0.16em] uppercase text-[#76746E] mt-1">{phase}</div>
          <div className="text-[10.5px] font-mono text-[#76746E]">{fmt12(time)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="font-bold text-[15px]">{status}</div>
        <div className="font-mono text-[12px] text-[#B8B6B0]">
          {hours < WAKE_HOUR
            ? `${formatTime(Math.round((WAKE_HOUR - hours) * 60))} until wake-up`
            : hours < SLEEP_HOUR
            ? `${formatTime(minsLeft)} productive time left`
            : "Rest — you earned it"
          }
        </div>
        <div className="text-[11px] font-mono text-[#76746E]">7:00 AM – 12:00 AM</div>
      </div>
    </div>
  );
}

function HabitsRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const C = 2 * Math.PI * 28;
  const color = pct >= 100 ? "#6BE3A4" : pct >= 66 ? "#F2C063" : pct >= 33 ? "#60A5FA" : "#76746E";
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-[64px] h-[64px]">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            transform="rotate(-90 32 32)" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-mono" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div>
        <div className="font-bold text-sm" style={{ color }}>{done}/{total} habits</div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#76746E]">Today</div>
        {pct >= 100 && <div className="text-[10px] text-[#6BE3A4]">🔥 All done!</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const today = todayStr();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStats>({ total: 0, done: 0 });
  const [water, setWater] = useState<WaterData>({ amount_ml: 0, goal_ml: 2500 });
  const [nutrition, setNutrition] = useState<{ totals: NutritionTotals; goals: NutritionGoals } | null>(null);
  const [bodyLatest, setBodyLatest] = useState<BodyLatest | null>(null);
  const [newTask, setNewTask] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    const [healthRes, goalsRes, tasksRes, insightsRes, habitsRes, waterRes, nutritionRes, bodyRes] = await Promise.all([
      fetch(`/api/health?date=${today}`),
      fetch(`/api/goals`),
      fetch(`/api/goals?type=daily&date=${today}`),
      fetch(`/api/ai/insights`),
      fetch(`/api/habits?date=${today}`),
      fetch(`/api/water?date=${today}`),
      fetch(`/api/nutrition?date=${today}`),
      fetch(`/api/body?days=1`),
    ]);

    const [healthData, goalsData, tasksData, insightsData, habitsData, waterData, nutritionData, bodyData] = await Promise.all([
      healthRes.json(), goalsRes.json(), tasksRes.json(), insightsRes.json(),
      habitsRes.json(), waterRes.json(), nutritionRes.json(), bodyRes.json(),
    ]);

    setHealth(healthData.data);
    setGoals(goalsData.goals ?? []);
    setTasks(tasksData.tasks ?? []);
    setInsights(insightsData.insights ?? []);
    setHabitStats(habitsData.stats ?? { total: 0, done: 0 });
    setWater({ amount_ml: waterData.amount_ml ?? 0, goal_ml: waterData.goal_ml ?? 2500 });
    if (nutritionData.totals) setNutrition({ totals: nutritionData.totals, goals: nutritionData.goals ?? { calories: 2500, protein: 180, carbs: 250, fat: 80 } });
    setBodyLatest(bodyData.latest ?? null);
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleTask = async (task: DailyTask) => {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, type: "daily", done: !task.done }),
    });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
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

  const generateDailyPlan = async () => {
    setGeneratingPlan(true);
    try {
      const res = await fetch("/api/ai/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => {
          const manual = prev.filter(t => !t.ai_generated);
          const aiTasks = (data.tasks as string[]).map((text: string, i: number) => ({
            id: Date.now() + i, text, done: false, ai_generated: true, queued: false,
          }));
          return [...manual, ...aiTasks];
        });
        await loadData();
      }
    } finally {
      setGeneratingPlan(false);
    }
  };

  const refreshInsights = async () => {
    setGeneratingInsights(true);
    try {
      await fetch("/api/ai/insights", { method: "POST" });
      await loadData();
    } finally {
      setGeneratingInsights(false);
    }
  };

  const syncGarmin = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/garmin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (res.ok) await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const addWater = async (ml: number) => {
    const res = await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "add", amount_ml: ml, date: today }),
    });
    const data = await res.json();
    setWater({ amount_ml: data.amount_ml ?? 0, goal_ml: data.goal_ml ?? 2500 });
  };

  const doneTasks = tasks.filter(t => t.done).length;
  const urgentGoals = goals.filter(g => g.urgency === "critical" || g.urgency === "high");
  const criticalInsights = insights.filter(i => i.priority === "high" && !i.read);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">
            {formatDate(today, "EEEE, MMMM d")}
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Dashboard</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={syncGarmin} loading={syncing}>
            ⌚ Sync Garmin
          </Button>
          <Button variant="secondary" size="sm" onClick={refreshInsights} loading={generatingInsights}>
            🧠 AI Insights
          </Button>
        </div>
      </div>

      {/* Critical alerts */}
      {criticalInsights.length > 0 && (
        <div className="space-y-2">
          {criticalInsights.map(insight => (
            <div key={insight.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/25">
              <span className="text-[#FF6B6B] text-lg flex-shrink-0">⚠️</span>
              <p className="text-sm text-[#FAFAFA]">{insight.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Day ring */}
      <Card>
        <DayRing />
      </Card>

      {/* Today's stats strip: habits + water + nutrition + body */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Habits ring */}
        <Card className="flex items-center gap-4">
          <HabitsRing done={habitStats.done} total={habitStats.total} />
          {habitStats.total === 0 && (
            <div className="text-xs text-[#76746E]">No habits yet</div>
          )}
        </Card>

        {/* Water */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E]">💧 Water</div>
            <span className="text-xs font-bold font-mono text-[#60A5FA]">{water.amount_ml}ml</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (water.amount_ml / water.goal_ml) * 100)}%`,
                background: water.amount_ml >= water.goal_ml ? "#6BE3A4" : "#60A5FA",
              }} />
          </div>
          <div className="flex gap-1.5">
            {[250, 500].map(ml => (
              <button key={ml} onClick={() => addWater(ml)}
                className="flex-1 py-1 text-[10px] font-mono rounded-lg bg-[#60A5FA]/10 border border-[#60A5FA]/20 text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors">
                +{ml}ml
              </button>
            ))}
          </div>
          <div className="text-[9px] font-mono text-[#76746E] mt-1.5">goal: {water.goal_ml}ml</div>
        </Card>

        {/* Nutrition today */}
        <Card>
          <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">🥗 Nutrition</div>
          {nutrition ? (
            <>
              <div className="text-xl font-bold font-mono text-[#F2C063]">{Math.round(nutrition.totals.calories)}<span className="text-xs text-[#76746E] ml-1">kcal</span></div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden my-2">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (nutrition.totals.calories / nutrition.goals.calories) * 100)}%`, background: "#F2C063" }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#76746E]">
                <span>P: {Math.round(nutrition.totals.protein)}g</span>
                <span>C: {Math.round(nutrition.totals.carbs)}g</span>
                <span>F: {Math.round(nutrition.totals.fat)}g</span>
              </div>
            </>
          ) : (
            <div className="text-[11px] text-[#76746E]">Nothing logged</div>
          )}
        </Card>

        {/* Body weight */}
        <Card>
          <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">⚖️ Body</div>
          {bodyLatest?.weight_kg ? (
            <>
              <div className="text-xl font-bold font-mono text-[#6BE3A4]">{bodyLatest.weight_kg}<span className="text-xs text-[#76746E] ml-1">kg</span></div>
              {bodyLatest.body_fat_pct && (
                <div className="text-xs font-mono text-[#76746E] mt-1">{bodyLatest.body_fat_pct}% body fat</div>
              )}
              {bodyLatest.date && (
                <div className="text-[9px] font-mono text-[#76746E] mt-1">{formatDate(bodyLatest.date, "d MMM")}</div>
              )}
            </>
          ) : (
            <div className="text-[11px] text-[#76746E]">Not logged</div>
          )}
        </Card>
      </div>

      {/* Health snapshot */}
      {health && (
        <div>
          <SectionTitle>Recovery Status</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Sleep",
                value: health.sleep_duration_min ? `${(health.sleep_duration_min / 60).toFixed(1)}h` : "—",
                sub: health.sleep_duration_min ? (health.sleep_duration_min >= 420 ? "Optimal" : health.sleep_duration_min >= 360 ? "Good" : "Short") : "No data",
                color: health.sleep_duration_min ? (health.sleep_duration_min >= 420 ? "#6BE3A4" : health.sleep_duration_min >= 360 ? "#F2C063" : "#FF6B6B") : "#76746E",
                icon: "😴",
              },
              {
                label: "HRV",
                value: health.hrv_avg ? `${Math.round(health.hrv_avg)}ms` : "—",
                sub: health.hrv_avg ? hrvStatus(health.hrv_avg).label : "No data",
                color: health.hrv_avg ? hrvStatus(health.hrv_avg).color : "#76746E",
                icon: "💓",
              },
              {
                label: "Resting HR",
                value: health.resting_hr ? `${health.resting_hr}bpm` : "—",
                sub: health.resting_hr ? (health.resting_hr < 60 ? "Excellent" : health.resting_hr < 70 ? "Good" : "Elevated") : "No data",
                color: health.resting_hr ? (health.resting_hr < 60 ? "#6BE3A4" : health.resting_hr < 70 ? "#F2C063" : "#FF6B6B") : "#76746E",
                icon: "❤️",
              },
              {
                label: "Body Battery",
                value: health.body_battery_start ? `${health.body_battery_start}%` : "—",
                sub: health.body_battery_start ? (health.body_battery_start >= 75 ? "Charged" : health.body_battery_start >= 50 ? "Good" : "Drained") : "No data",
                color: health.body_battery_start ? bodyBatteryColor(health.body_battery_start) : "#76746E",
                icon: "⚡",
              },
            ].map(metric => (
              <Card key={metric.label} className="text-center">
                <div className="text-xl mb-1">{metric.icon}</div>
                <div className="text-[22px] font-bold font-mono tracking-[-0.02em]" style={{ color: metric.color }}>
                  {metric.value}
                </div>
                <div className="text-[11px] font-mono text-[#76746E] uppercase tracking-[0.1em]">{metric.label}</div>
                <div className="text-xs text-[#B8B6B0] mt-0.5">{metric.sub}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Urgent goals */}
      {urgentGoals.length > 0 && (
        <div>
          <SectionTitle>Urgent Goals</SectionTitle>
          <div className="space-y-2">
            {urgentGoals.map(goal => (
              <div key={goal.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                style={{
                  background: goal.urgency === "critical" ? "rgba(255,107,107,0.06)" : "rgba(242,192,99,0.06)",
                  borderColor: goal.urgency === "critical" ? "rgba(255,107,107,0.2)" : "rgba(242,192,99,0.2)",
                }}>
                <span className="text-xl">{categoryIcon(goal.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{goal.title}</div>
                  {goal.target_value && (
                    <div className="text-xs text-[#76746E] font-mono mt-0.5">
                      {goal.current_value ?? 0} / {goal.target_value} {goal.unit}
                    </div>
                  )}
                </div>
                <UrgencyBadge urgency={goal.urgency} />
                {goal.deadline && (
                  <span className="text-xs font-mono text-[#76746E]">
                    {Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000))}d left
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Today&rsquo;s Plan</SectionTitle>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#76746E]">{doneTasks}/{tasks.length} done</span>
            <Button variant="ghost" size="sm" onClick={generateDailyPlan} loading={generatingPlan}>
              🤖 AI Plan
            </Button>
          </div>
        </div>

        <Card>
          {tasks.length > 0 && (
            <div className="flex gap-1 mb-4 h-1.5">
              {tasks.map(t => (
                <div key={t.id} className="flex-1 rounded-full transition-all duration-300"
                  style={{ background: t.done ? "#6BE3A4" : "rgba(255,255,255,0.08)", boxShadow: t.done ? "0 0 6px rgba(107,227,164,0.4)" : "none" }} />
              ))}
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-[#76746E]">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-sm">No tasks yet. Add one below or let AI generate your plan.</div>
            </div>
          ) : (
            <ul className="space-y-2 mb-4">
              {tasks.map(task => (
                <li key={task.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${task.done ? "opacity-50 bg-[#6BE3A4]/[0.03] border-white/4" : "bg-white/[0.035] border-white/6 hover:bg-white/[0.06]"}`}>
                  <label className="custom-cb">
                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} />
                    <span className="custom-cb-box" />
                  </label>
                  <span className={`flex-1 text-sm ${task.done ? "line-through text-[#76746E]" : ""}`}>{task.text}</span>
                  {task.ai_generated && (
                    <span className="text-[9px] font-mono text-[#76746E] uppercase tracking-wider">AI</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addTask} className="flex gap-2 pt-3 border-t border-white/6">
            <input
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="Add a task for today…"
              className="flex-1 px-3 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] placeholder-[#76746E] outline-none transition-colors focus:border-white/22"
            />
            <Button type="submit" variant="primary" size="sm">+ Add</Button>
          </form>
        </Card>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div>
          <SectionTitle>AI Coach Insights</SectionTitle>
          <div className="space-y-3">
            {insights.slice(0, 3).map(insight => (
              <div key={insight.id} className="flex items-start gap-3 px-4 py-3 rounded-xl border"
                style={{
                  background: insight.type === "alert" ? "rgba(255,107,107,0.06)" : insight.priority === "high" ? "rgba(242,192,99,0.06)" : "rgba(255,255,255,0.04)",
                  borderColor: insight.type === "alert" ? "rgba(255,107,107,0.2)" : insight.priority === "high" ? "rgba(242,192,99,0.2)" : "rgba(255,255,255,0.06)",
                }}>
                <span className="text-lg flex-shrink-0">
                  {insight.type === "alert" ? "⚠️" : insight.priority === "high" ? "🔴" : "💡"}
                </span>
                <p className="text-sm text-[#B8B6B0]">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <SectionTitle>Quick Access</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/habits", label: "Habits", icon: "✅", color: "#6BE3A4" },
            { href: "/training", label: "Log Workout", icon: "🏋️", color: "#F2C063" },
            { href: "/nutrition", label: "Log Food", icon: "🥗", color: "#60A5FA" },
            { href: "/journal", label: "Write Journal", icon: "📔", color: "#A78BFA" },
          ].map(link => (
            <a key={link.href} href={link.href}>
              <Card className="text-center hover:bg-white/[0.07] transition-colors cursor-pointer">
                <div className="text-2xl mb-2">{link.icon}</div>
                <div className="text-xs font-medium text-[#B8B6B0]">{link.label}</div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
