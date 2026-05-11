"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { GoalPlan } from "@/lib/ai";

type Category = "athletic" | "business" | "financial" | "mental" | "social";

const CATEGORIES: { key: Category; label: string; icon: string; color: string }[] = [
  { key: "athletic", label: "Sport", icon: "🏃", color: "#60A5FA" },
  { key: "business", label: "Business", icon: "💼", color: "#F2C063" },
  { key: "financial", label: "Finanzen", icon: "💰", color: "#6BE3A4" },
  { key: "mental", label: "Geist", icon: "🧘", color: "#C084FC" },
  { key: "social", label: "Soziales", icon: "👥", color: "#FB923C" },
];

const FIT_COLORS: Record<string, string> = {
  aligned: "text-[#6BE3A4] bg-[#6BE3A4]/10 border-[#6BE3A4]/30",
  challenging: "text-[#F2C063] bg-[#F2C063]/10 border-[#F2C063]/30",
  misaligned: "text-[#FF6B6B] bg-[#FF6B6B]/10 border-[#FF6B6B]/30",
};

const FIT_LABELS: Record<string, string> = {
  aligned: "Passt gut",
  challenging: "Herausfordernd",
  misaligned: "Kritisch hinterfragen",
};

interface StoredPlan {
  id: number;
  category: Category;
  title: string;
  goal_description: string;
  personality_fit: string;
  fit_level: string;
  daily_action: string;
  next_milestone: string;
  quick_wins: string[];
  plan_json: GoalPlan;
  timeframe: string;
}

interface FormState {
  category: Category;
  goal: string;
  currentState: string;
  timeframe: string;
  motivation: string;
  pastExperience: string;
}

const TIMEFRAMES = ["4 Wochen", "3 Monate", "6 Monate", "1 Jahr", "2 Jahre"];

function PlanCard({ plan, onDelete }: { plan: StoredPlan; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES.find(c => c.key === plan.category);
  const fitClass = FIT_COLORS[plan.fit_level] ?? FIT_COLORS.aligned;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{cat?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: cat?.color }}>
              {cat?.label}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${fitClass}`}>
              {FIT_LABELS[plan.fit_level]}
            </span>
            {plan.timeframe && (
              <span className="text-[10px] text-[#76746E] font-mono">{plan.timeframe}</span>
            )}
          </div>
          <h3 className="text-base font-bold text-[#FAFAFA] leading-snug">{plan.title}</h3>
        </div>
      </div>

      <div className="mx-4 mb-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#76746E] mb-1">Heute tun</div>
        <p className="text-sm font-semibold text-[#FAFAFA]">{plan.daily_action}</p>
      </div>

      {plan.next_milestone && (
        <div className="mx-4 mb-3">
          <span className="text-[10px] text-[#76746E]">Nächster Meilenstein: </span>
          <span className="text-[10px] text-[#B8B6B0]">{plan.next_milestone}</span>
        </div>
      )}

      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-t border-white/5 text-xs text-[#76746E] hover:text-[#B8B6B0] transition-colors"
      >
        <span>Vollständiger Plan</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          <div className={`p-3 rounded-xl border text-xs leading-relaxed ${fitClass}`}>
            <div className="font-semibold mb-1">Coach-Einschätzung</div>
            {plan.personality_fit}
          </div>

          {plan.quick_wins?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-2">Diese Woche starten</div>
              <div className="space-y-1.5">
                {plan.quick_wins.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#6BE3A4] text-xs flex-shrink-0 mt-0.5">→</span>
                    <span className="text-xs text-[#B8B6B0]">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.plan_json?.phases?.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-2">Phasen</div>
              <div className="space-y-3">
                {plan.plan_json.phases.map((phase, i) => (
                  <div key={i} className="pl-3 border-l-2 border-white/10">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#FAFAFA]">{phase.name}</span>
                      <span className="text-[10px] text-[#76746E]">{phase.duration}</span>
                    </div>
                    <p className="text-[11px] text-[#76746E] mb-1.5">{phase.focus}</p>
                    <div className="space-y-0.5">
                      {phase.actions?.map((a, j) => (
                        <div key={j} className="text-[11px] text-[#B8B6B0]">• {a}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/15">
              <div className="text-[9px] font-mono uppercase text-[#FF6B6B] mb-1">Größtes Risiko</div>
              <p className="text-[11px] text-[#B8B6B0]">{plan.plan_json?.biggestRisk}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#6BE3A4]/5 border border-[#6BE3A4]/15">
              <div className="text-[9px] font-mono uppercase text-[#6BE3A4] mb-1">Erfolgsmetrik</div>
              <p className="text-[11px] text-[#B8B6B0]">{plan.plan_json?.successMetric}</p>
            </div>
          </div>

          <button onClick={onDelete} className="text-[11px] text-[#FF6B6B]/60 hover:text-[#FF6B6B] transition-colors">
            Plan archivieren
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({
    category: "athletic",
    goal: "",
    currentState: "",
    timeframe: "3 Monate",
    motivation: "",
    pastExperience: "",
  });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GoalPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPlans = () =>
    fetch("/api/plans").then(r => r.json()).then(d => setPlans(d.plans ?? []));

  useEffect(() => { loadPlans(); }, []);

  const generate = async () => {
    if (!form.goal.trim()) { setError("Beschreibe dein Ziel"); return; }
    setGenerating(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error.includes("ANTHROPIC_API_KEY")
          ? "Kein API Key. Settings → AI & API Keys → Anthropic Key eintragen."
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

  const savePlan = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          title: form.goal.slice(0, 80),
          goal_description: form.goal,
          current_state: form.currentState,
          timeframe: form.timeframe,
          personality_fit: preview.personalityFit,
          fit_level: preview.fitLevel,
          daily_action: preview.dailyAction,
          next_milestone: preview.nextMilestone,
          quick_wins: preview.quickWins,
          plan_json: preview,
        }),
      });
      setPreview(null);
      setShowForm(false);
      setForm({ category: "athletic", goal: "", currentState: "", timeframe: "3 Monate", motivation: "", pastExperience: "" });
      await loadPlans();
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: number) => {
    await fetch("/api/plans", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadPlans();
  };

  const setF = (key: keyof FormState, v: string) => setForm(p => ({ ...p, [key]: v }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Planning</div>
        <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Ziele & Pläne</h1>
        <p className="text-sm text-[#76746E] mt-1">KI bewertet dein Ziel ehrlich und erstellt einen konkreten Aktionsplan — kein Tracking, nur Fortschritt.</p>
      </div>

      {plans.length > 0 && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#76746E]">
            Aktive Pläne ({plans.length})
          </div>
          {plans.map(p => (
            <PlanCard key={p.id} plan={p} onDelete={() => deletePlan(p.id)} />
          ))}
        </div>
      )}

      {plans.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-[#76746E] text-sm mb-1">Noch keine Pläne.</p>
          <p className="text-[#76746E] text-xs">Füge dein erstes Ziel hinzu — die KI erstellt einen ehrlichen Plan.</p>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setPreview(null); }}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 text-[#76746E] hover:border-white/20 hover:text-[#B8B6B0] transition-all text-sm font-medium"
        >
          + Neues Ziel hinzufügen
        </button>
      )}

      {showForm && (
        <Card>
          <div className="text-sm font-bold text-[#FAFAFA] mb-4">Neues Ziel</div>

          <div className="mb-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">Bereich</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setF("category", cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.category === cat.key
                      ? "border-transparent text-[#050506]"
                      : "border-white/10 text-[#76746E] hover:text-[#B8B6B0]"
                  }`}
                  style={form.category === cat.key ? { background: cat.color } : {}}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-1.5">
                Ziel beschreiben *
              </label>
              <textarea
                rows={2}
                value={form.goal}
                onChange={e => setF("goal", e.target.value)}
                placeholder={
                  form.category === "athletic" ? "z.B. Sub-20 5K laufen, Ruhepuls unter 40 bpm" :
                  form.category === "business" ? "z.B. €10k/Monat Umsatz mit meinem Softwareprodukt" :
                  form.category === "financial" ? "z.B. €50k Eigenkapital bis Ende 2026" :
                  form.category === "mental" ? "z.B. Täglich meditieren, mehr Bücher lesen, weniger Stress" :
                  "z.B. 3 echte Freundschaften vertiefen, aktiver netzwerken"
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-[#FAFAFA] placeholder-[#76746E] focus:outline-none focus:border-white/20 resize-none"
              />
            </div>
            <Input
              label="Aktueller Stand"
              value={form.currentState}
              onChange={e => setF("currentState", e.target.value)}
              placeholder={
                form.category === "athletic" ? "z.B. 5K in 22:30, laufe 3x/Woche" :
                form.category === "business" ? "z.B. €2k/Monat, Solo-Freelancer seit 1 Jahr" :
                form.category === "financial" ? "z.B. €8k gespart, Ausgaben ~€2.5k/Monat" :
                form.category === "mental" ? "z.B. Meditiere manchmal, lese kaum, oft gestresst" :
                "z.B. Wenig Zeit für Freunde, hauptsächlich online-Kontakt"
              }
            />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-1.5">Zeitrahmen</div>
              <div className="flex gap-2 flex-wrap">
                {TIMEFRAMES.map(t => (
                  <button
                    key={t}
                    onClick={() => setF("timeframe", t)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      form.timeframe === t
                        ? "border-[#60A5FA]/50 bg-[#60A5FA]/10 text-[#60A5FA]"
                        : "border-white/10 text-[#76746E] hover:text-[#B8B6B0]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Motivation (optional — hilft der KI)"
              value={form.motivation}
              onChange={e => setF("motivation", e.target.value)}
              placeholder="Warum ist dir das wichtig?"
            />
            <Input
              label="Bisherige Erfahrung (optional)"
              value={form.pastExperience}
              onChange={e => setF("pastExperience", e.target.value)}
              placeholder="Hast du das schon versucht? Was ist passiert?"
            />
          </div>

          {error && <p className="mt-3 text-xs text-[#FF6B6B]">✗ {error}</p>}

          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={generate} loading={generating}>
              {generating ? "KI analysiert..." : "Plan generieren"}
            </Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setPreview(null); setError(""); }}>
              Abbrechen
            </Button>
          </div>
        </Card>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#76746E]">Vorschau — noch nicht gespeichert</div>

          <div className={`p-4 rounded-2xl border ${FIT_COLORS[preview.fitLevel] ?? FIT_COLORS.aligned}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Coach-Einschätzung</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${FIT_COLORS[preview.fitLevel]}`}>
                {FIT_LABELS[preview.fitLevel]}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{preview.personalityFit}</p>
          </div>

          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#76746E] mb-1.5">Tägliche Aktion</div>
            <p className="text-base font-bold text-[#FAFAFA]">{preview.dailyAction}</p>
          </div>

          <div className="p-4 rounded-2xl border border-[#6BE3A4]/20 bg-[#6BE3A4]/5">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#6BE3A4] mb-2">Diese Woche starten</div>
            <div className="space-y-1.5">
              {preview.quickWins?.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#6BE3A4] flex-shrink-0">→</span>
                  <span className="text-sm text-[#B8B6B0]">{w}</span>
                </div>
              ))}
            </div>
          </div>

          {preview.phases?.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#76746E]">Phasen</div>
              {preview.phases.map((p, i) => (
                <div key={i} className="flex items-baseline gap-3 px-3 py-2 rounded-xl border border-white/5 bg-white/[0.02]">
                  <span className="text-xs font-bold text-[#FAFAFA] w-28 flex-shrink-0">{p.name}</span>
                  <span className="text-[10px] text-[#76746E] w-20 flex-shrink-0">{p.duration}</span>
                  <span className="text-xs text-[#76746E]">{p.focus}</span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#FF6B6B]/5 border border-[#FF6B6B]/15">
            <span className="text-[10px] font-mono uppercase text-[#FF6B6B]">Größtes Risiko: </span>
            <span className="text-xs text-[#B8B6B0]">{preview.biggestRisk}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={savePlan} loading={saving}>Plan speichern</Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>Neu generieren</Button>
          </div>
        </div>
      )}
    </div>
  );
}
