"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { GoalPlan } from "@/lib/ai";

interface SocialPlan {
  id: number;
  title: string;
  daily_action: string;
  next_milestone: string;
  quick_wins: string[];
  personality_fit: string;
  plan_json: GoalPlan;
  timeframe: string;
}

export default function SocialPage() {
  const [plan, setPlan] = useState<SocialPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [goal, setGoal] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [timeframe, setTimeframe] = useState("3 Monate");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GoalPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        const s = (d.plans ?? []).find((p: { category: string }) => p.category === "social");
        if (s) setPlan(s as SocialPlan);
      });
  }, []);

  const generate = async () => {
    if (!goal.trim()) { setError("Beschreibe dein Ziel"); return; }
    setGenerating(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "social", goal, currentState, timeframe }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.includes("ANTHROPIC_API_KEY") ? "Kein API Key. Settings → AI & API Keys." : data.error);
        return;
      }
      setPreview(data as GoalPlan);
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "social",
          title: goal.slice(0, 80),
          goal_description: goal,
          current_state: currentState,
          timeframe,
          personality_fit: preview.personalityFit,
          fit_level: preview.fitLevel,
          daily_action: preview.dailyAction,
          next_milestone: preview.nextMilestone,
          quick_wins: preview.quickWins,
          plan_json: preview,
        }),
      });
      const res = await fetch("/api/plans");
      const d = await res.json();
      const s = (d.plans ?? []).find((p: { category: string }) => p.category === "social");
      if (s) setPlan(s as SocialPlan);
      setPreview(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Connections</div>
        <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Soziales</h1>
        <p className="text-sm text-[#76746E] mt-1">Echte Beziehungen und wertvolles Netzwerk — aktiv gestaltet, nicht passiv verwaltet.</p>
      </div>

      {plan && !showForm && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-[#FB923C]/30 bg-[#FB923C]/5">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#FB923C] mb-1.5">Diese Woche</div>
            <p className="text-base font-bold text-[#FAFAFA]">{plan.daily_action}</p>
          </div>
          {plan.next_milestone && (
            <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02]">
              <span className="text-[10px] text-[#76746E]">Nächster Meilenstein: </span>
              <span className="text-sm text-[#B8B6B0]">{plan.next_milestone}</span>
            </div>
          )}
          {plan.quick_wins?.length > 0 && (
            <Card>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-3">Konkrete Aktionen</div>
              <div className="space-y-2">
                {plan.quick_wins.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#FB923C] flex-shrink-0">→</span>
                    <span className="text-sm text-[#B8B6B0]">{w}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {plan.plan_json?.phases?.length > 0 && (
            <Card>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-3">Phasen</div>
              <div className="space-y-3">
                {plan.plan_json.phases.map((phase, i) => (
                  <div key={i} className="pl-3 border-l-2 border-[#FB923C]/20">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#FAFAFA]">{phase.name}</span>
                      <span className="text-[10px] text-[#76746E]">{phase.duration}</span>
                    </div>
                    <p className="text-[11px] text-[#76746E]">{phase.focus}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Button variant="secondary" onClick={() => setShowForm(true)}>Plan aktualisieren</Button>
        </div>
      )}

      {!plan && !showForm && (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">👥</div>
          <p className="text-[#76746E] text-sm mb-6">Noch kein sozialer Plan. Beziehungen brauchen Intention, nicht Zufall.</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>Plan erstellen</Button>
        </div>
      )}

      {showForm && (
        <Card>
          <div className="text-sm font-bold text-[#FAFAFA] mb-4">Sozialer Plan</div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-1.5">Ziel *</label>
              <textarea
                rows={2}
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="z.B. 3 tiefe Freundschaften aufbauen, Netzwerk in der Tech-Szene aufbauen, mehr Zeit mit Familie"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-[#FAFAFA] placeholder-[#76746E] focus:outline-none focus:border-white/20 resize-none"
              />
            </div>
            <Input
              label="Aktueller Stand"
              value={currentState}
              onChange={e => setCurrentState(e.target.value)}
              placeholder="z.B. Wenig Zeit für Freunde, hauptsächlich online-Kontakt, introvertiert"
            />
            <div className="flex gap-2 flex-wrap">
              {["4 Wochen", "3 Monate", "6 Monate", "1 Jahr"].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${
                    timeframe === t ? "border-[#FB923C]/50 bg-[#FB923C]/10 text-[#FB923C]" : "border-white/10 text-[#76746E]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-[#FF6B6B]">✗ {error}</p>}
          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={generate} loading={generating}>
              {generating ? "Wird erstellt..." : "Plan generieren"}
            </Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setPreview(null); }}>Abbrechen</Button>
          </div>
        </Card>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-[#FB923C]/30 bg-[#FB923C]/5">
            <div className="text-xs font-bold text-[#FB923C] mb-2">Coach-Einschätzung</div>
            <p className="text-sm text-[#B8B6B0] leading-relaxed">{preview.personalityFit}</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="text-[9px] font-mono uppercase text-[#76746E] mb-1">Wöchentliche Aktion</div>
            <p className="text-base font-bold text-[#FAFAFA]">{preview.dailyAction}</p>
          </div>
          <div className="p-4 rounded-2xl border border-[#FB923C]/20 bg-[#FB923C]/5">
            <div className="text-[9px] font-mono uppercase text-[#FB923C] mb-2">Diese Woche</div>
            {preview.quickWins?.map((w, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <span className="text-[#FB923C]">→</span>
                <span className="text-sm text-[#B8B6B0]">{w}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={save} loading={saving}>Speichern</Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>Neu generieren</Button>
          </div>
        </div>
      )}
    </div>
  );
}
