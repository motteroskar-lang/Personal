"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { todayStr, formatDate } from "@/lib/utils";

interface Exercise { id: number; name: string; sets: number; reps: string; weight?: number; weight_unit?: string; rpe?: number; notes?: string }
interface Workout { id: number; date: string; name: string; type: string; duration_min?: number; notes?: string }
interface PR { exercise_name: string; value: number; unit: string; date: string }

const WORKOUT_TYPES = [
  { value: "strength", label: "💪 Strength" },
  { value: "cardio", label: "🏃 Cardio" },
  { value: "hiit", label: "🔥 HIIT" },
  { value: "mobility", label: "🧘 Mobility" },
  { value: "sport", label: "⚽ Sport" },
];

const emptyExercise = () => ({ name: "", sets: "3", reps: "8", weight: "", weight_unit: "kg", rpe: "", notes: "" });

export default function TrainingPage() {
  const today = todayStr();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [prs, setPRs] = useState<PR[]>([]);
  const [selected, setSelected] = useState<{ workout: Workout; exercises: Exercise[] } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState<{ name: string; data: Array<{ date: string; weight: number }> } | null>(null);
  const [form, setForm] = useState({ date: today, name: "", workout_type: "strength", duration_min: "", notes: "" });
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/training?days=30");
    const data = await res.json();
    setWorkouts(data.workouts ?? []);
    setPRs(data.prs ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openWorkout = async (w: Workout) => {
    const res = await fetch(`/api/training?id=${w.id}`);
    const data = await res.json();
    setSelected({ workout: data.workout, exercises: data.exercises });
  };

  const loadExerciseHistory = async (name: string) => {
    const res = await fetch(`/api/training?exercise=${encodeURIComponent(name)}`);
    const data = await res.json();
    setExerciseHistory({
      name,
      data: (data.history as Array<{ date: string; weight: number }>).filter(h => h.weight).reverse(),
    });
  };

  const saveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const payload = {
        ...form,
        duration_min: form.duration_min ? parseInt(form.duration_min) : undefined,
        exercises: exercises
          .filter(ex => ex.name.trim())
          .map(ex => ({
            name: ex.name,
            sets: parseInt(ex.sets) || 1,
            reps: ex.reps,
            weight: ex.weight ? parseFloat(ex.weight) : undefined,
            weight_unit: ex.weight_unit,
            rpe: ex.rpe ? parseFloat(ex.rpe) : undefined,
            notes: ex.notes,
          })),
      };
      const res = await fetch("/api/training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
      setModalOpen(false);
      setForm({ date: today, name: "", workout_type: "strength", duration_min: "", notes: "" });
      setExercises([emptyExercise()]);
      await load();
    } catch (err) { setApiError(String(err).replace("Error: ", "")); }
  };

  const deleteWorkout = async (id: number) => {
    if (!confirm("Delete this workout?")) return;
    await fetch(`/api/training?id=${id}`, { method: "DELETE" });
    setSelected(null);
    await load();
  };

  const addExerciseRow = () => setExercises(prev => [...prev, emptyExercise()]);
  const updateExercise = (i: number, field: string, value: string) => {
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));
  };
  const removeExerciseRow = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i));

  const weeklyVolume = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    return d >= weekAgo;
  }).length;

  const prsByExercise = prs.reduce((acc: Record<string, PR>, pr) => {
    if (!acc[pr.exercise_name] || pr.value > acc[pr.exercise_name].value) acc[pr.exercise_name] = pr;
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Progressive Overload Tracker</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Training</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ Log Workout</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "This Week", value: weeklyVolume, sub: "sessions", icon: "📅", color: "#6BE3A4" },
          { label: "Total Workouts", value: workouts.length, sub: "last 30 days", icon: "🏋️", color: "#F2C063" },
          { label: "PRs Set", value: Object.keys(prsByExercise).length, sub: "exercises tracked", icon: "🏆", color: "#A78BFA" },
        ].map(s => (
          <Card key={s.label} className="text-center py-3">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] mt-0.5">{s.label}</div>
            <div className="text-[10px] text-[#76746E]">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* PRs */}
      {Object.keys(prsByExercise).length > 0 && (
        <div>
          <SectionTitle>Personal Records</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(prsByExercise).map(pr => (
              <Card key={pr.exercise_name} className="cursor-pointer hover:bg-white/[0.07]" onClick={() => loadExerciseHistory(pr.exercise_name)}>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#76746E] mb-1">PR</div>
                <div className="text-xl font-bold font-mono text-[#F2C063]">{pr.value} {pr.unit}</div>
                <div className="text-sm font-medium mt-0.5">{pr.exercise_name}</div>
                <div className="text-[10px] font-mono text-[#76746E] mt-1">{formatDate(pr.date)}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Exercise history modal */}
      {exerciseHistory && (
        <Modal open={true} onClose={() => setExerciseHistory(null)} title={`${exerciseHistory.name} — Progress`}>
          {exerciseHistory.data.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={exerciseHistory.data}>
                <XAxis dataKey="date" tick={{ fill: "#76746E", fontSize: 9 }} tickFormatter={d => formatDate(d, "d MMM")} />
                <YAxis tick={{ fill: "#76746E", fontSize: 9 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#0A0A0B", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="weight" stroke="#F2C063" strokeWidth={2} dot={{ r: 3, fill: "#F2C063" }} name="Weight (kg)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-6 text-[#76746E]">Not enough data to show trend yet.</div>
          )}
        </Modal>
      )}

      {/* Workout list */}
      <div>
        <SectionTitle>Recent Workouts</SectionTitle>
        {workouts.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-[#76746E]">
              <div className="text-4xl mb-2">🏋️</div>
              <div className="text-sm mb-3">No workouts logged yet. Start tracking your gains.</div>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ Log First Workout</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {workouts.map(w => (
              <div key={w.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${selected?.workout.id === w.id ? "bg-white/[0.07] border-white/15" : "bg-white/[0.04] border-white/6 hover:bg-white/[0.06]"}`}
                onClick={() => selected?.workout.id === w.id ? setSelected(null) : openWorkout(w)}>
                <div className="text-xl">{w.type === "cardio" ? "🏃" : w.type === "hiit" ? "🔥" : w.type === "mobility" ? "🧘" : "🏋️"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{w.name}</div>
                  <div className="text-xs font-mono text-[#76746E]">{formatDate(w.date)} {w.duration_min ? `· ${w.duration_min}min` : ""}</div>
                </div>
                <Badge variant="default">{w.type}</Badge>
                <button onClick={e => { e.stopPropagation(); deleteWorkout(w.id); }}
                  className="text-[#76746E] hover:text-[#FF6B6B] transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100 text-lg leading-none">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected workout detail */}
      {selected && (
        <div>
          <SectionTitle>Exercises — {selected.workout.name}</SectionTitle>
          <Card>
            {selected.exercises.length === 0 ? (
              <div className="text-[#76746E] text-sm text-center py-4">No exercises logged for this session.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="text-[#76746E] text-left border-b border-white/5 text-[11px] uppercase tracking-wider">
                      <th className="pb-2 pr-4">Exercise</th>
                      <th className="pb-2 pr-4">Sets</th>
                      <th className="pb-2 pr-4">Reps</th>
                      <th className="pb-2 pr-4">Weight</th>
                      <th className="pb-2">RPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selected.exercises.map(ex => (
                      <tr key={ex.id} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => loadExerciseHistory(ex.name)}>
                        <td className="py-2 pr-4 text-[#FAFAFA]">{ex.name}</td>
                        <td className="py-2 pr-4 text-[#B8B6B0]">{ex.sets}</td>
                        <td className="py-2 pr-4 text-[#B8B6B0]">{ex.reps}</td>
                        <td className="py-2 pr-4 font-bold text-[#F2C063]">{ex.weight ? `${ex.weight} ${ex.weight_unit}` : "—"}</td>
                        <td className="py-2 text-[#76746E]">{ex.rpe ? `@${ex.rpe}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Workout Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setApiError(null); }} title="Log Workout" className="max-w-2xl">
        <form onSubmit={saveWorkout} className="space-y-4">
          {apiError && <div className="px-3 py-2 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs">{apiError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <Select label="Type" value={form.workout_type} onChange={e => setForm(p => ({ ...p, workout_type: e.target.value }))} options={WORKOUT_TYPES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Workout Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Push Day A" required />
            <Input label="Duration (min)" type="number" value={form.duration_min} onChange={e => setForm(p => ({ ...p, duration_min: e.target.value }))} placeholder="60" />
          </div>

          {/* Exercises */}
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#76746E] mb-2">Exercises</div>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center">
                  <div className="col-span-2">
                    <input value={ex.name} onChange={e => updateExercise(i, "name", e.target.value)} placeholder="Exercise name"
                      className="w-full px-2 py-2 text-sm bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#FAFAFA] placeholder-[#76746E] outline-none focus:border-white/22" />
                  </div>
                  <input value={ex.sets} onChange={e => updateExercise(i, "sets", e.target.value)} placeholder="Sets"
                    className="px-2 py-2 text-sm bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#FAFAFA] placeholder-[#76746E] outline-none focus:border-white/22" />
                  <input value={ex.reps} onChange={e => updateExercise(i, "reps", e.target.value)} placeholder="Reps"
                    className="px-2 py-2 text-sm bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#FAFAFA] placeholder-[#76746E] outline-none focus:border-white/22" />
                  <input value={ex.weight} onChange={e => updateExercise(i, "weight", e.target.value)} placeholder="kg"
                    className="px-2 py-2 text-sm bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#FAFAFA] placeholder-[#76746E] outline-none focus:border-white/22" />
                  <button type="button" onClick={() => removeExerciseRow(i)} className="text-[#76746E] hover:text-[#FF6B6B] transition-colors text-xl leading-none">×</button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addExerciseRow} className="mt-2">+ Add Exercise</Button>
          </div>

          <Textarea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="How did it feel? Any notes…" />

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Workout</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
