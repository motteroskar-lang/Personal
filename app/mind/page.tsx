"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { GoalPlan } from "@/lib/ai";

interface MindPlan {
  id: number;
  title: string;
  daily_action: string;
  next_milestone: string;
  quick_wins: string[];
  personality_fit: string;
  fit_level: string;
  plan_json: GoalPlan;
  timeframe: string;
}

export default function MindPage() {
  const [plan, setPlan] = useState<MindPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [goal, setGoal] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [timeframe, setTimeframe] = useState("3 Monate");
  const [areas, setAreas] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GoalPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const MIND_AREAS = ["Meditation", "Lesen", "Journaling", "Lernen", "Stressreduktion", "Kreativität", "Achtsamkeit"];

  useEffect(() => {
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        const mental = (d.plans ?? []).find((p: { category: string }) => p.category === "mental");
        if (mental) setPlan(mental as MindPlan);
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
        body: JSON.stringify({
          category: "mental",
          goal: `${goal}${areas.length ? `. Bereiche: ${areas.join(", ")}` : ""}`,
          currentState,
          timeframe,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.includes("ANTHROPIC_API_KEY")
          ? "Kein API Key. Settings → AI & API Keys."
          : data.error);
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
          category: "mental",
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
      const mental = (d.plans ?? []).find((p: { category: string }) => p.category === "mental");
      if (mental) setPlan(mental as MindPlan);
      setPreview(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Inner Work</div>
        <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Geist & Spiritualität</h1>
        <p className="text-sm text-[#76746E] mt-1">Mentale Klarheit, Wachstum und innere Stärke — strategisch geplant.</p>
      </div>

      {plan && !showForm && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-[#C084FC]/30 bg-[#C084FC]/5">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#C084FC] mb-1.5">Heute</div>
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
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-3">Diese Woche</div>
              <div className="space-y-2">
                {plan.quick_wins.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#C084FC] flex-shrink-0">→</span>
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
                  <div key={i} className="pl-3 border-l-2 border-[#C084FC]/20">
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

          <Button variant="secondary" onClick={() => setShowForm(true)}>Plan neu erstellen</Button>
        </div>
      )}

      {!plan && !showForm && (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🧘</div>
          <p className="text-[#76746E] text-sm mb-6">Noch kein mentaler Plan. Die KI hilft dir, geistige Klarheit zu entwickeln.</p>
          <Button variant="primary" onClick={() => setShowForm(true)}>Plan erstellen</Button>
        </div>
      )}

      {showForm && (
        <Card>
          <div className="text-sm font-bold text-[#FAFAFA] mb-4">Mentaler & spiritueller Plan</div>

          <div className="mb-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">Bereiche (optional)</div>
            <div className="flex flex-wrap gap-2">
              {MIND_AREAS.map(a => (
                <button
                  key={a}
                  onClick={() => setAreas(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${
                    areas.includes(a)
                      ? "border-[#C084FC]/50 bg-[#C084FC]/10 text-[#C084FC]"
                      : "border-white/10 text-[#76746E] hover:text-[#B8B6B0]"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-1.5">Was willst du erreichen? *</label>
              <textarea
                rows={2}
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="z.B. Mehr mentale Klarheit, weniger Stress, täglich meditieren, 24 Bücher im Jahr lesen"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-[#FAFAFA] placeholder-[#76746E] focus:outline-none focus:border-white/20 resize-none"
              />
            </div>
            <Input
              label="Aktueller Stand"
              value={currentState}
              onChange={e => setCurrentState(e.target.value)}
              placeholder="z.B. Meditiere gelegentlich, lese ~1 Buch/Monat, oft gestresst"
            />
            <div className="flex gap-2 flex-wrap">
              {["4 Wochen", "3 Monate", "6 Monate", "1 Jahr"].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${
                    timeframe === t ? "border-[#C084FC]/50 bg-[#C084FC]/10 text-[#C084FC]" : "border-white/10 text-[#76746E]"
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
          <div className="p-4 rounded-2xl border border-[#C084FC]/30 bg-[#C084FC]/5">
            <div className="text-xs font-bold text-[#C084FC] mb-2">Coach-Einschätzung</div>
            <p className="text-sm text-[#B8B6B0] leading-relaxed">{preview.personalityFit}</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="text-[9px] font-mono uppercase text-[#76746E] mb-1">Tägliche Praxis</div>
            <p className="text-base font-bold text-[#FAFAFA]">{preview.dailyAction}</p>
          </div>
          <div className="p-4 rounded-2xl border border-[#C084FC]/20 bg-[#C084FC]/5">
            <div className="text-[9px] font-mono uppercase text-[#C084FC] mb-2">Diese Woche starten</div>
            {preview.quickWins?.map((w, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <span className="text-[#C084FC]">→</span>
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
