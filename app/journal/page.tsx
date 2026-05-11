"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Input } from "@/components/ui/Input";
import { todayStr, formatDate, moodEmoji } from "@/lib/utils";

interface JournalEntry {
  id: number;
  date: string;
  content: string;
  mood?: number;
  energy?: number;
  gratitude?: string;
  wins?: string;
  challenges?: string;
  ai_insight?: string;
  created_at: number;
}

export default function JournalPage() {
  const today = todayStr();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [form, setForm] = useState({
    content: "", mood: "7", energy: "7",
    gratitude: "", wins: "", challenges: "",
  });

  const load = useCallback(async () => {
    const [todayRes, histRes] = await Promise.all([
      fetch(`/api/journal?date=${selectedDate}`),
      fetch("/api/journal?all=true&limit=20"),
    ]);
    const todayData = await todayRes.json();
    const histData = await histRes.json();

    if (todayData.entry) {
      setEntry(todayData.entry);
      setForm({
        content: todayData.entry.content ?? "",
        mood: todayData.entry.mood?.toString() ?? "7",
        energy: todayData.entry.energy?.toString() ?? "7",
        gratitude: todayData.entry.gratitude ?? "",
        wins: todayData.entry.wins ?? "",
        challenges: todayData.entry.challenges ?? "",
      });
    } else {
      setEntry(null);
      setForm({ content: "", mood: "7", energy: "7", gratitude: "", wins: "", challenges: "" });
    }
    setHistory(histData.entries ?? []);
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setApiError(null);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          content: form.content,
          mood: parseInt(form.mood),
          energy: parseInt(form.energy),
          gratitude: form.gratitude || null,
          wins: form.wins || null,
          challenges: form.challenges || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
      await load();
    } catch (err) { setApiError(String(err).replace("Error: ", "")); }
    finally { setSaving(false); }
  };

  const moodScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Daily Reflection</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Journal</h1>
        </div>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] outline-none focus:border-white/22" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={save} className="space-y-4">
            <Card>
              <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#76746E] mb-3">
                {formatDate(selectedDate, "EEEE, MMMM d")}
              </div>

              {/* Mood & Energy */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">Mood {moodEmoji(parseInt(form.mood))}</div>
                  <div className="flex gap-1">
                    {moodScale.map(n => (
                      <button key={n} type="button" onClick={() => setForm(p => ({ ...p, mood: n.toString() }))}
                        className={`flex-1 h-7 rounded-md text-xs font-mono transition-all ${form.mood === n.toString() ? "bg-[#6BE3A4] text-[#0A0A0B] font-bold" : "bg-white/[0.05] text-[#76746E] hover:bg-white/10"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#76746E] mb-2">Energy ⚡</div>
                  <div className="flex gap-1">
                    {moodScale.map(n => (
                      <button key={n} type="button" onClick={() => setForm(p => ({ ...p, energy: n.toString() }))}
                        className={`flex-1 h-7 rounded-md text-xs font-mono transition-all ${form.energy === n.toString() ? "bg-[#F2C063] text-[#0A0A0B] font-bold" : "bg-white/[0.05] text-[#76746E] hover:bg-white/10"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Textarea
                label="Today's Entry"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="What happened today? How are you feeling? What did you learn?..."
                rows={8}
                className="text-sm leading-relaxed"
              />
            </Card>

            <Card>
              <div className="space-y-3">
                <Textarea label="3 Things I'm Grateful For" value={form.gratitude}
                  onChange={e => setForm(p => ({ ...p, gratitude: e.target.value }))}
                  placeholder="1. ..." rows={3} />
                <Textarea label="Wins Today" value={form.wins}
                  onChange={e => setForm(p => ({ ...p, wins: e.target.value }))}
                  placeholder="What did you accomplish?" rows={2} />
                <Textarea label="Challenges & Lessons" value={form.challenges}
                  onChange={e => setForm(p => ({ ...p, challenges: e.target.value }))}
                  placeholder="What was hard? What would you do differently?" rows={2} />
              </div>
            </Card>

            {apiError && <div className="px-3 py-2 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs">{apiError}</div>}
            <Button variant="primary" type="submit" loading={saving} className="w-full">
              {saving ? "Saving & Generating AI Insight…" : "Save Entry"}
            </Button>
          </form>

          {/* AI Insight */}
          {entry?.ai_insight && (
            <Card accent="success">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">🧠</span>
                <div>
                  <div className="text-[10.5px] font-mono font-bold uppercase tracking-[0.14em] text-[#6BE3A4] mb-2">AI Coach Insight</div>
                  <p className="text-sm text-[#B8B6B0] leading-relaxed">{entry.ai_insight}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* History sidebar */}
        <div className="space-y-3">
          <SectionTitle>Previous Entries</SectionTitle>
          {history.length === 0 ? (
            <Card>
              <div className="text-center py-6 text-[#76746E] text-sm">No journal entries yet.</div>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.date}
                  className={`px-4 py-3 rounded-xl border cursor-pointer transition-colors ${selectedDate === h.date ? "bg-white/[0.07] border-white/15" : "bg-white/[0.04] border-white/6 hover:bg-white/[0.06]"}`}
                  onClick={() => setSelectedDate(h.date)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono text-[#76746E]">{formatDate(h.date, "EEE, MMM d")}</div>
                    <div className="flex items-center gap-1.5">
                      {h.mood && <span className="text-sm">{moodEmoji(h.mood)}</span>}
                      {h.ai_insight && <span className="text-xs text-[#6BE3A4]">AI</span>}
                    </div>
                  </div>
                  <p className="text-xs text-[#B8B6B0] mt-1 line-clamp-2">{h.content}</p>
                  {(h.mood || h.energy) && (
                    <div className="flex gap-3 mt-2 text-[10px] font-mono text-[#76746E]">
                      {h.mood && <span>Mood {h.mood}/10</span>}
                      {h.energy && <span>Energy {h.energy}/10</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Mood trend */}
          {history.length > 2 && (
            <Card>
              <div className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-3">Mood Trend</div>
              <div className="flex items-end gap-1 h-12">
                {history.slice(0, 14).reverse().map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all" title={`${formatDate(h.date)}: ${h.mood}/10`}
                    style={{ height: `${((h.mood ?? 5) / 10) * 100}%`, background: (h.mood ?? 5) >= 7 ? "#6BE3A4" : (h.mood ?? 5) >= 5 ? "#F2C063" : "#FF6B6B", opacity: 0.7 }} />
                ))}
              </div>
              <div className="text-[10px] font-mono text-[#76746E] mt-2">Last {Math.min(14, history.length)} days</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
