"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CoachingPlan, CoachDayPlan, CoachTargets } from "@/lib/ai";

type Focus = "strength" | "aesthetics" | "cardio";

interface CurrentStats {
  rhr?: number;
  hrv?: number;
  sleep_h?: number;
  weight?: number;
  body_fat?: number;
}

const FOCUS_OPTIONS: { key: Focus; label: string; icon: string; desc: string }[] = [
  { key: "strength", label: "Kraft", icon: "💪", desc: "Maximale Kraft, PRs, Progressive Overload" },
  { key: "aesthetics", label: "Ästhetik", icon: "✨", desc: "Körperkompositon, Hypertrophie, Körperfett" },
  { key: "cardio", label: "Cardio", icon: "🏃", desc: "5K, Ruhepuls, VO2max, Ausdauer" },
];

const DAY_COLORS: Record<string, string> = {
  training: "border-[#60A5FA]/30 bg-[#60A5FA]/5",
  rest: "border-white/10 bg-white/[0.02]",
  recovery: "border-[#6BE3A4]/30 bg-[#6BE3A4]/5",
};

const DAY_BADGE: Record<string, string> = {
  training: "bg-[#60A5FA]/20 text-[#60A5FA]",
  rest: "bg-white/10 text-[#76746E]",
  recovery: "bg-[#6BE3A4]/20 text-[#6BE3A4]",
};

function DayCard({ day }: { day: CoachDayPlan }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-3 ${DAY_COLORS[day.type]} cursor-pointer`} onClick={() => setOpen(p => !p)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full ${DAY_BADGE[day.type]}`}>
              {day.type}
            </span>
            <span className="text-[10px] text-[#76746E] font-mono">{day.day}</span>
          </div>
          <div className="text-sm font-semibold text-[#FAFAFA] leading-snug">{day.title}</div>
        </div>
        <span className="text-[#76746E] text-xs mt-1 flex-shrink-0">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <p className="text-xs text-[#B8B6B0] whitespace-pre-line">{day.details}</p>
          {day.nutrition && (
            <div className="p-2 rounded-lg bg-[#F2C063]/5 border border-[#F2C063]/15">
              <span className="text-[9px] font-mono uppercase text-[#F2C063]">Ernährung: </span>
              <span className="text-xs text-[#76746E]">{day.nutrition}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CoachPage() {
  const [focus, setFocus] = useState<Focus>("cardio");
  const [targets, setTargets] = useState<CoachTargets>({});
  const [stats, setStats] = useState<CurrentStats>({});
  const [plan, setPlan] = useState<CoachingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/health?days=1").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/body?days=1").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([health, body]) => {
      const latest = health?.data?.[0];
      const latestBody = body?.data?.[0];
      setStats({
        rhr: latest?.resting_hr ?? undefined,
        hrv: latest?.hrv_avg ?? undefined,
        sleep_h: latest?.sleep_duration_min ? latest.sleep_duration_min / 60 : undefined,
        weight: latestBody?.weight ?? undefined,
        body_fat: latestBody?.body_fat ?? undefined,
      });
      if (latestBody?.weight) setTargets(p => ({ ...p, weight_current: latestBody.weight }));
      if (latestBody?.body_fat) setTargets(p => ({ ...p, body_fat_current: latestBody.body_fat }));
    });
  }, []);

  const generate = async () => {
    setLoading(true);
    setError("");
    setPlan(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus, targets }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setPlan(data as CoachingPlan);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const setT = (key: keyof CoachTargets, value: string | number) =>
    setTargets(p => ({ ...p, [key]: value === "" ? undefined : value }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Performance</div>
        <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">AI Coach</h1>
        <p className="text-sm text-[#76746E] mt-1">Personalisierter Wochenplan basierend auf deinen Zielen und aktuellen Daten.</p>
      </div>

      {/* Focus selector */}
      <div>
        <SectionTitle>Trainings-Fokus</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => { setFocus(opt.key); setPlan(null); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                focus === opt.key
                  ? "border-[#60A5FA]/50 bg-[#60A5FA]/10"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/5"
              }`}
            >
              <div className="text-xl mb-1">{opt.icon}</div>
              <div className="text-sm font-semibold text-[#FAFAFA]">{opt.label}</div>
              <div className="text-[10px] text-[#76746E] mt-0.5 leading-snug">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Targets */}
      <div>
        <SectionTitle>Deine Ziele</SectionTitle>
        <Card>
          {focus === "cardio" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="5K aktuell (mm:ss)"
                  placeholder="z.B. 22:30"
                  value={(targets.fiveK_current as string) ?? ""}
                  onChange={e => setT("fiveK_current", e.target.value)}
                />
                <Input
                  label="5K Ziel (mm:ss)"
                  placeholder="z.B. 19:59"
                  value={(targets.fiveK_target as string) ?? ""}
                  onChange={e => setT("fiveK_target", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Ruhepuls aktuell (bpm)"
                    type="number"
                    placeholder={stats.rhr ? String(stats.rhr) : "z.B. 52"}
                    value={(targets.rhr_target as number | undefined) != null ? "" : ""}
                    onChange={() => {}}
                    disabled
                  />
                  {stats.rhr && <p className="text-[10px] text-[#6BE3A4] mt-1">Auto-geladen: {stats.rhr} bpm</p>}
                </div>
                <Input
                  label="Ruhepuls Ziel (bpm)"
                  type="number"
                  placeholder="z.B. 40"
                  value={(targets.rhr_target as number) ?? ""}
                  onChange={e => setT("rhr_target", Number(e.target.value))}
                />
              </div>
              <Input
                label="Wöchentliche Laufkilometer Ziel"
                type="number"
                placeholder="z.B. 40"
                value={(targets.weekly_km as number) ?? ""}
                onChange={e => setT("weekly_km", Number(e.target.value))}
              />
            </div>
          )}

          {focus === "strength" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bankdrücken aktuell 1RM (kg)" type="number" placeholder="z.B. 80"
                  value={(targets.bench_current as number) ?? ""} onChange={e => setT("bench_current", Number(e.target.value))} />
                <Input label="Bankdrücken Ziel 1RM (kg)" type="number" placeholder="z.B. 100"
                  value={(targets.bench_target as number) ?? ""} onChange={e => setT("bench_target", Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Kniebeuge aktuell 1RM (kg)" type="number" placeholder="z.B. 120"
                  value={(targets.squat_current as number) ?? ""} onChange={e => setT("squat_current", Number(e.target.value))} />
                <Input label="Kniebeuge Ziel 1RM (kg)" type="number" placeholder="z.B. 160"
                  value={(targets.squat_target as number) ?? ""} onChange={e => setT("squat_target", Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Kreuzheben aktuell 1RM (kg)" type="number" placeholder="z.B. 140"
                  value={(targets.deadlift_current as number) ?? ""} onChange={e => setT("deadlift_current", Number(e.target.value))} />
                <Input label="Kreuzheben Ziel 1RM (kg)" type="number" placeholder="z.B. 200"
                  value={(targets.deadlift_target as number) ?? ""} onChange={e => setT("deadlift_target", Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Klimmzüge aktuell (Wdh.)" type="number" placeholder="z.B. 8"
                  value={(targets.pullups_current as number) ?? ""} onChange={e => setT("pullups_current", Number(e.target.value))} />
                <Input label="Klimmzüge Ziel (Wdh.)" type="number" placeholder="z.B. 15"
                  value={(targets.pullups_target as number) ?? ""} onChange={e => setT("pullups_target", Number(e.target.value))} />
              </div>
            </div>
          )}

          {focus === "aesthetics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input label="Gewicht aktuell (kg)" type="number" placeholder={stats.weight ? String(stats.weight) : "z.B. 85"}
                    value={(targets.weight_target as number) ? "" : ""}
                    onChange={() => {}} disabled />
                  {stats.weight && <p className="text-[10px] text-[#6BE3A4] mt-1">Auto-geladen: {stats.weight} kg</p>}
                </div>
                <Input label="Gewicht Ziel (kg)" type="number" placeholder="z.B. 78"
                  value={(targets.weight_target as number) ?? ""} onChange={e => setT("weight_target", Number(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Körperfett aktuell (%)" type="number" placeholder="z.B. 18"
                  value={(targets.body_fat_current as number) ?? ""} onChange={e => setT("body_fat_current", Number(e.target.value))} />
                <Input label="Körperfett Ziel (%)" type="number" placeholder="z.B. 12"
                  value={(targets.body_fat_target as number) ?? ""} onChange={e => setT("body_fat_target", Number(e.target.value))} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Current Stats strip */}
      <div>
        <SectionTitle>Aktuelle Daten (automatisch)</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Ruhepuls", value: stats.rhr ? `${stats.rhr} bpm` : "—", color: "#FF6B6B" },
            { label: "HRV", value: stats.hrv ? `${stats.hrv} ms` : "—", color: "#60A5FA" },
            { label: "Schlaf", value: stats.sleep_h ? `${stats.sleep_h.toFixed(1)}h` : "—", color: "#6BE3A4" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
              <div className="text-[10px] font-mono uppercase text-[#76746E] mb-1">{s.label}</div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        {!stats.rhr && !stats.hrv && (
          <p className="text-xs text-[#76746E] mt-2">Keine Health-Daten vorhanden. Trag sie manuell auf der Health-Seite ein.</p>
        )}
      </div>

      {/* Generate button */}
      <Button variant="primary" onClick={generate} loading={loading} className="w-full py-4 text-base">
        {loading ? "Plan wird generiert..." : "🤖 Coaching Plan generieren"}
      </Button>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-sm">
          ✗ {error === "ANTHROPIC_API_KEY not configured"
            ? "Kein Anthropic API Key. Trag ihn in Settings → AI & API Keys ein."
            : error}
        </div>
      )}

      {/* Plan display */}
      {plan && (
        <div className="space-y-5">
          {/* Assessment + Time */}
          <div className="rounded-xl border border-[#F2C063]/30 bg-[#F2C063]/5 p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#F2C063] mb-2">Coach Assessment</div>
            <p className="text-sm text-[#FAFAFA] leading-relaxed">{plan.assessment}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#76746E] uppercase">Zeitrahmen:</span>
              <span className="text-xs font-semibold text-[#F2C063]">{plan.timeToGoal}</span>
            </div>
          </div>

          {/* Weekly focus + Key metric */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/5 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#60A5FA] mb-1.5">Diese Woche fokussieren</div>
              <p className="text-sm text-[#FAFAFA] font-medium">{plan.weeklyFocus}</p>
            </div>
            <div className="rounded-xl border border-[#6BE3A4]/30 bg-[#6BE3A4]/5 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#6BE3A4] mb-1.5">Tägliche Metrik tracken</div>
              <p className="text-sm text-[#FAFAFA] font-medium">{plan.keyMetric}</p>
            </div>
          </div>

          {/* 7-day plan */}
          <div>
            <SectionTitle>Wochenplan</SectionTitle>
            <div className="space-y-2">
              {plan.weekPlan.map(day => (
                <DayCard key={day.day} day={day} />
              ))}
            </div>
          </div>

          {/* Nutrition targets */}
          <div>
            <SectionTitle>Ernährungs-Ziele</SectionTitle>
            <Card>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[
                  { label: "Kalorien", value: plan.nutritionTargets.calories, unit: "kcal", color: "#F2C063" },
                  { label: "Protein", value: plan.nutritionTargets.protein, unit: "g", color: "#6BE3A4" },
                  { label: "Carbs", value: plan.nutritionTargets.carbs, unit: "g", color: "#60A5FA" },
                  { label: "Fett", value: plan.nutritionTargets.fat, unit: "g", color: "#C084FC" },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <div className="text-[10px] font-mono uppercase text-[#76746E] mb-1">{m.label}</div>
                    <div className="text-lg font-bold" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[10px] text-[#76746E]">{m.unit}</div>
                  </div>
                ))}
              </div>
              {plan.nutritionTargets.note && (
                <p className="text-xs text-[#76746E] border-t border-white/10 pt-3">{plan.nutritionTargets.note}</p>
              )}
            </Card>
          </div>

          {/* Recovery */}
          <div>
            <SectionTitle>Recovery Protokoll</SectionTitle>
            <Card>
              <p className="text-sm text-[#B8B6B0] leading-relaxed">{plan.recoveryNotes}</p>
            </Card>
          </div>

          {/* Regenerate */}
          <Button variant="secondary" onClick={generate} loading={loading} className="w-full">
            Plan neu generieren
          </Button>
        </div>
      )}
    </div>
  );
}
