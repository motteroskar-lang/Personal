"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CATEGORIES: Record<string, { icon: string; color: string; label: string }> = {
  athletic: { icon: "🏃", color: "#60A5FA", label: "Sport" },
  business: { icon: "💼", color: "#F2C063", label: "Business" },
  financial: { icon: "💰", color: "#6BE3A4", label: "Finanzen" },
  mental: { icon: "🧘", color: "#C084FC", label: "Geist" },
  social: { icon: "👥", color: "#FB923C", label: "Soziales" },
};

interface Plan {
  id: number;
  category: string;
  title: string;
  daily_action: string;
  next_milestone: string;
  fit_level: string;
}

interface DoneState {
  [id: number]: boolean;
}

export default function TodayPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [done, setDone] = useState<DoneState>({});
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        const activePlans: Plan[] = d.plans ?? [];
        setPlans(activePlans);
        setLoading(false);
        if (activePlans.length > 0) {
          setBriefingLoading(true);
          fetch("/api/ai/briefing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plans: activePlans }),
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.briefing) setBriefing(d.briefing); })
            .catch(() => {})
            .finally(() => setBriefingLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (id: number) => setDone(p => ({ ...p, [id]: !p[id] }));

  const completedCount = plans.filter(p => done[p.id]).length;
  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date header */}
      <div>
        <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">
          {today}
        </div>
        <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Heute</h1>
      </div>

      {/* AI briefing */}
      {(briefing || briefingLoading) && (
        <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#76746E] mb-1">KI-Briefing</div>
          {briefingLoading ? (
            <div className="h-4 w-48 rounded bg-white/10 animate-pulse" />
          ) : (
            <p className="text-sm text-[#B8B6B0] italic">&ldquo;{briefing}&rdquo;</p>
          )}
        </div>
      )}

      {/* Progress bar */}
      {plans.length > 0 && (
        <div>
          <div className="flex justify-between text-[10px] font-mono text-[#76746E] mb-1.5">
            <span>HEUTE ERLEDIGT</span>
            <span>{completedCount}/{plans.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${plans.length > 0 ? (completedCount / plans.length) * 100 : 0}%`,
                background: "linear-gradient(90deg, #6BE3A4, #60A5FA)",
              }}
            />
          </div>
        </div>
      )}

      {/* Daily actions */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-[#B8B6B0] font-semibold mb-2">Keine aktiven Pläne</p>
          <p className="text-[#76746E] text-sm mb-6">Füge deine Ziele hinzu — die KI erstellt konkrete Tagespläne.</p>
          <Link
            href="/goals"
            className="inline-block px-6 py-3 rounded-full text-sm font-semibold text-[#050506] transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6BE3A4, #60A5FA)" }}
          >
            Erstes Ziel hinzufügen →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const cat = CATEGORIES[plan.category] ?? { icon: "🎯", color: "#76746E", label: plan.category };
            const isDone = !!done[plan.id];
            return (
              <button
                key={plan.id}
                onClick={() => toggle(plan.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                  isDone
                    ? "border-white/5 bg-white/[0.01] opacity-50"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isDone ? "border-transparent" : "border-white/20"
                  }`}
                    style={isDone ? { background: cat.color } : {}}
                  >
                    {isDone && <span className="text-[#050506] text-xs font-bold">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.1em]" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold leading-snug ${isDone ? "line-through text-[#76746E]" : "text-[#FAFAFA]"}`}>
                      {plan.daily_action}
                    </p>
                    {plan.next_milestone && !isDone && (
                      <p className="text-[11px] text-[#76746E] mt-1 truncate">→ {plan.next_milestone}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Coach shortcut */}
      {plans.some(p => p.category === "athletic") && (
        <Link
          href="/coach"
          className="flex items-center justify-between p-4 rounded-2xl border border-[#60A5FA]/20 bg-[#60A5FA]/5 hover:bg-[#60A5FA]/10 transition-colors"
        >
          <div>
            <div className="text-[10px] font-mono uppercase text-[#60A5FA] mb-0.5">Trainingsplan</div>
            <div className="text-sm font-semibold text-[#FAFAFA]">Detaillierten Wochenplan öffnen →</div>
          </div>
          <span className="text-2xl">🏃</span>
        </Link>
      )}

      {/* Quick links */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#76746E] mb-3">Bereiche</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/goals", label: "Ziele & Pläne", icon: "🎯" },
            { href: "/coach", label: "Sport Coach", icon: "🏃" },
            { href: "/business", label: "Business", icon: "💼" },
            { href: "/mind", label: "Geist", icon: "🧘" },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-sm text-[#B8B6B0]"
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
