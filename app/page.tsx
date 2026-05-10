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
  respiratory_rate?: number;
  body_battery_start?: number;
  steps?: number;
  stress_avg?: number;
  spo2_avg?: number;
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

export default function Dashboard() {
  const today = todayStr();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [newTask, setNewTask] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadData = useCallback(async () => {
    const [healthRes, goalsRes, tasksRes, insightsRes] = await Promise.all([
      fetch(`/api/health?date=${today}`),
      fetch(`/api/goals`),
      fetch(`/api/goals?type=daily&date=${today}`),
      fetch(`/api/ai/insights`),
    ]);

    const healthData = await healthRes.json();
    const goalsData = await goalsRes.json();
    const tasksData = await tasksRes.json();
    const insightsData = await insightsRes.json();

    setHealth(healthData.data);
    setGoals(goalsData.goals ?? []);
    setTasks(tasksData.tasks ?? []);
    setInsights(insightsData.insights ?? []);
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
          {(health.respiratory_rate || health.spo2_avg) && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {health.respiratory_rate && (
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#76746E]">Respiratory Rate</div>
                      <div className="text-2xl font-bold font-mono mt-1">{health.respiratory_rate.toFixed(1)}</div>
                      <div className="text-xs text-[#76746E]">breaths/min</div>
                    </div>
                    <span className="text-3xl">🌬️</span>
                  </div>
                </Card>
              )}
              {health.spo2_avg && (
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#76746E]">SpO2</div>
                      <div className="text-2xl font-bold font-mono mt-1">{health.spo2_avg.toFixed(0)}%</div>
                      <div className="text-xs text-[#76746E]">blood oxygen</div>
                    </div>
                    <span className="text-3xl">🩸</span>
                  </div>
                </Card>
              )}
            </div>
          )}
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
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="flex gap-1 mb-4 h-1.5">
              {tasks.map(t => (
                <div key={t.id} className="flex-1 rounded-full transition-all duration-300"
                  style={{ background: t.done ? "#6BE3A4" : "rgba(255,255,255,0.08)", boxShadow: t.done ? "0 0 6px rgba(107,227,164,0.4)" : "none" }} />
              ))}
            </div>
          )}

          {/* Task list */}
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

          {/* Add task */}
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
            { href: "/health", label: "Log Health", icon: "❤️", color: "#6BE3A4" },
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
