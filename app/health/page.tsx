"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { todayStr, formatDate, formatTime, hrvStatus, bodyBatteryColor } from "@/lib/utils";

interface HealthEntry {
  date: string;
  sleep_duration_min?: number;
  sleep_score?: number;
  deep_sleep_min?: number;
  light_sleep_min?: number;
  rem_sleep_min?: number;
  hrv_avg?: number;
  resting_hr?: number;
  respiratory_rate?: number;
  body_battery_start?: number;
  stress_avg?: number;
  steps?: number;
  active_calories?: number;
  spo2_avg?: number;
  source?: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs space-y-1">
      <div className="font-mono text-[#76746E]">{formatDate(label ?? "", "MMM d")}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#B8B6B0]">{p.name}:</span>
          <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function HealthPage() {
  const today = todayStr();
  const [data, setData] = useState<HealthEntry[]>([]);
  const [todayData, setTodayData] = useState<HealthEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    date: today,
    sleep_duration_h: "", sleep_score: "", deep_sleep_min: "", light_sleep_min: "", rem_sleep_min: "",
    hrv_avg: "", resting_hr: "", respiratory_rate: "", body_battery_start: "",
    stress_avg: "", steps: "", active_calories: "", spo2_avg: "",
  });

  const load = useCallback(async () => {
    const [todayRes, histRes] = await Promise.all([
      fetch(`/api/health?date=${today}`),
      fetch("/api/health?days=14"),
    ]);
    const todayJson = await todayRes.json();
    const histJson = await histRes.json();
    setTodayData(todayJson.data);
    setData((histJson.data as HealthEntry[]).reverse());
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const syncGarmin = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/garmin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Sync failed");
      else await load();
    } finally {
      setSyncing(false);
    }
  };

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, number | string> = { date: form.date };
    if (form.sleep_duration_h) payload.sleep_duration_min = Math.round(parseFloat(form.sleep_duration_h) * 60);
    if (form.sleep_score) payload.sleep_score = parseInt(form.sleep_score);
    if (form.deep_sleep_min) payload.deep_sleep_min = parseInt(form.deep_sleep_min);
    if (form.light_sleep_min) payload.light_sleep_min = parseInt(form.light_sleep_min);
    if (form.rem_sleep_min) payload.rem_sleep_min = parseInt(form.rem_sleep_min);
    if (form.hrv_avg) payload.hrv_avg = parseFloat(form.hrv_avg);
    if (form.resting_hr) payload.resting_hr = parseInt(form.resting_hr);
    if (form.respiratory_rate) payload.respiratory_rate = parseFloat(form.respiratory_rate);
    if (form.body_battery_start) payload.body_battery_start = parseInt(form.body_battery_start);
    if (form.stress_avg) payload.stress_avg = parseInt(form.stress_avg);
    if (form.steps) payload.steps = parseInt(form.steps);
    if (form.active_calories) payload.active_calories = parseInt(form.active_calories);
    if (form.spo2_avg) payload.spo2_avg = parseFloat(form.spo2_avg);
    payload.source = "manual";

    await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setModalOpen(false);
    await load();
  };

  const prefillForm = () => {
    if (todayData) {
      setForm(prev => ({
        ...prev,
        date: today,
        sleep_duration_h: todayData.sleep_duration_min ? (todayData.sleep_duration_min / 60).toFixed(1) : "",
        hrv_avg: todayData.hrv_avg?.toString() ?? "",
        resting_hr: todayData.resting_hr?.toString() ?? "",
        respiratory_rate: todayData.respiratory_rate?.toString() ?? "",
        body_battery_start: todayData.body_battery_start?.toString() ?? "",
        stress_avg: todayData.stress_avg?.toString() ?? "",
        steps: todayData.steps?.toString() ?? "",
        spo2_avg: todayData.spo2_avg?.toString() ?? "",
      }));
    }
  };

  const avgHRV = data.length ? (data.reduce((s, d) => s + (d.hrv_avg ?? 0), 0) / data.filter(d => d.hrv_avg).length).toFixed(0) : "—";
  const avgSleep = data.length ? (data.filter(d => d.sleep_duration_min).reduce((s, d) => s + (d.sleep_duration_min ?? 0), 0) / data.filter(d => d.sleep_duration_min).length / 60).toFixed(1) : "—";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Health & Recovery</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Health</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={syncGarmin} loading={syncing}>⌚ Sync Garmin</Button>
          <Button variant="primary" size="sm" onClick={() => { prefillForm(); setModalOpen(true); }}>+ Log Data</Button>
        </div>
      </div>

      {/* Today's snapshot */}
      {todayData ? (
        <div>
          <SectionTitle>Last Night ({formatDate(today)})</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Sleep", value: todayData.sleep_duration_min ? `${(todayData.sleep_duration_min / 60).toFixed(1)}h` : "—", sub: todayData.sleep_duration_min ? (todayData.sleep_duration_min >= 420 ? "Optimal" : todayData.sleep_duration_min >= 360 ? "Good" : "Short") : "No data", color: todayData.sleep_duration_min ? (todayData.sleep_duration_min >= 420 ? "#6BE3A4" : todayData.sleep_duration_min >= 360 ? "#F2C063" : "#FF6B6B") : "#76746E", icon: "😴" },
              { label: "HRV", value: todayData.hrv_avg ? `${Math.round(todayData.hrv_avg)}ms` : "—", sub: todayData.hrv_avg ? hrvStatus(todayData.hrv_avg).label : "No data", color: todayData.hrv_avg ? hrvStatus(todayData.hrv_avg).color : "#76746E", icon: "💓" },
              { label: "Resting HR", value: todayData.resting_hr ? `${todayData.resting_hr}bpm` : "—", sub: todayData.resting_hr ? (todayData.resting_hr < 60 ? "Excellent" : todayData.resting_hr < 70 ? "Good" : "Elevated") : "No data", color: todayData.resting_hr ? (todayData.resting_hr < 60 ? "#6BE3A4" : todayData.resting_hr < 70 ? "#F2C063" : "#FF6B6B") : "#76746E", icon: "❤️" },
              { label: "Resp. Rate", value: todayData.respiratory_rate ? `${todayData.respiratory_rate.toFixed(1)}` : "—", sub: "breaths/min", color: "#B8B6B0", icon: "🌬️" },
              { label: "Body Battery", value: todayData.body_battery_start ? `${todayData.body_battery_start}%` : "—", sub: todayData.body_battery_start ? (todayData.body_battery_start >= 75 ? "Charged" : "Moderate") : "No data", color: todayData.body_battery_start ? bodyBatteryColor(todayData.body_battery_start) : "#76746E", icon: "⚡" },
              { label: "SpO2", value: todayData.spo2_avg ? `${todayData.spo2_avg.toFixed(0)}%` : "—", sub: "blood oxygen", color: todayData.spo2_avg ? (todayData.spo2_avg >= 95 ? "#6BE3A4" : "#FF6B6B") : "#76746E", icon: "🩸" },
            ].map(m => (
              <Card key={m.label} className="text-center py-3">
                <div className="text-xl mb-1">{m.icon}</div>
                <div className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#76746E] mt-0.5">{m.label}</div>
                <div className="text-[10px] text-[#B8B6B0] mt-0.5">{m.sub}</div>
              </Card>
            ))}
          </div>

          {/* Sleep stages */}
          {(todayData.deep_sleep_min || todayData.rem_sleep_min) && (
            <Card className="mt-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#76746E] mb-3">Sleep Stages</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Deep", min: todayData.deep_sleep_min, color: "#7C3AED" },
                  { label: "REM", min: todayData.rem_sleep_min, color: "#3B82F6" },
                  { label: "Light", min: todayData.light_sleep_min, color: "#60A5FA" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.min ? formatTime(s.min) : "—"}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#76746E]">{s.label}</div>
                  </div>
                ))}
              </div>
              {todayData.sleep_duration_min && (
                <div className="flex h-2 rounded-full overflow-hidden mt-4 gap-0.5">
                  {[
                    { min: todayData.deep_sleep_min ?? 0, color: "#7C3AED" },
                    { min: todayData.rem_sleep_min ?? 0, color: "#3B82F6" },
                    { min: todayData.light_sleep_min ?? 0, color: "#60A5FA" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-full transition-all" style={{ width: `${(s.min / todayData.sleep_duration_min!) * 100}%`, background: s.color }} />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="text-center py-8 text-[#76746E]">
            <div className="text-4xl mb-2">⌚</div>
            <div className="text-sm mb-3">No health data for today yet.</div>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" size="sm" onClick={syncGarmin} loading={syncing}>Sync Garmin</Button>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>Log Manually</Button>
            </div>
          </div>
        </Card>
      )}

      {/* 14-day charts */}
      {data.length > 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* HRV Chart */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#76746E]">HRV — 14 Days</div>
                <div className="text-sm font-bold text-[#6BE3A4]">avg {avgHRV}ms</div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data.filter(d => d.hrv_avg)}>
                  <defs>
                    <linearGradient id="hrvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6BE3A4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6BE3A4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "#76746E", fontSize: 9 }} tickFormatter={d => formatDate(d, "d")} />
                  <YAxis tick={{ fill: "#76746E", fontSize: 9 }} domain={["auto", "auto"]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="hrv_avg" stroke="#6BE3A4" fill="url(#hrvGrad)" strokeWidth={1.5} dot={false} name="HRV (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Sleep Chart */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#76746E]">Sleep — 14 Days</div>
                <div className="text-sm font-bold text-[#60A5FA]">avg {avgSleep}h</div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data.filter(d => d.sleep_duration_min).map(d => ({ ...d, sleep_h: d.sleep_duration_min ? +(d.sleep_duration_min / 60).toFixed(1) : 0 }))}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "#76746E", fontSize: 9 }} tickFormatter={d => formatDate(d, "d")} />
                  <YAxis tick={{ fill: "#76746E", fontSize: 9 }} domain={[0, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sleep_h" stroke="#60A5FA" fill="url(#sleepGrad)" strokeWidth={1.5} dot={false} name="Sleep (h)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Resting HR */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#76746E]">Resting Heart Rate</div>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={data.filter(d => d.resting_hr)}>
                <XAxis dataKey="date" tick={{ fill: "#76746E", fontSize: 9 }} tickFormatter={d => formatDate(d, "d")} />
                <YAxis tick={{ fill: "#76746E", fontSize: 9 }} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="resting_hr" stroke="#FF6B6B" strokeWidth={1.5} dot={{ r: 2, fill: "#FF6B6B" }} name="RHR (bpm)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* History table */}
      {data.length > 0 && (
        <div>
          <SectionTitle>14-Day History</SectionTitle>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-[#76746E] text-left border-b border-white/5">
                    {["Date", "Sleep", "HRV", "RHR", "Resp.", "Battery", "Steps"].map(h => (
                      <th key={h} className="pb-2 pr-4 font-normal uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[...data].reverse().slice(0, 14).map(row => (
                    <tr key={row.date} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 pr-4 text-[#B8B6B0]">{formatDate(row.date, "EEE d MMM")}</td>
                      <td className="py-2 pr-4" style={{ color: row.sleep_duration_min ? (row.sleep_duration_min >= 420 ? "#6BE3A4" : row.sleep_duration_min >= 360 ? "#F2C063" : "#FF6B6B") : "#76746E" }}>
                        {row.sleep_duration_min ? `${(row.sleep_duration_min / 60).toFixed(1)}h` : "—"}
                      </td>
                      <td className="py-2 pr-4" style={{ color: row.hrv_avg ? hrvStatus(row.hrv_avg).color : "#76746E" }}>
                        {row.hrv_avg ? `${Math.round(row.hrv_avg)}ms` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-[#B8B6B0]">{row.resting_hr ? `${row.resting_hr}bpm` : "—"}</td>
                      <td className="py-2 pr-4 text-[#B8B6B0]">{row.respiratory_rate ? `${row.respiratory_rate.toFixed(1)}` : "—"}</td>
                      <td className="py-2 pr-4" style={{ color: row.body_battery_start ? bodyBatteryColor(row.body_battery_start) : "#76746E" }}>
                        {row.body_battery_start ? `${row.body_battery_start}%` : "—"}
                      </td>
                      <td className="py-2 text-[#B8B6B0]">{row.steps ? row.steps.toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Manual log modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Health Data">
        <form onSubmit={saveEntry} className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sleep Duration (h)" type="number" step="0.1" value={form.sleep_duration_h} onChange={e => setForm(p => ({ ...p, sleep_duration_h: e.target.value }))} placeholder="7.5" />
            <Input label="Sleep Score (0-100)" type="number" value={form.sleep_score} onChange={e => setForm(p => ({ ...p, sleep_score: e.target.value }))} placeholder="78" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Deep Sleep (min)" type="number" value={form.deep_sleep_min} onChange={e => setForm(p => ({ ...p, deep_sleep_min: e.target.value }))} placeholder="90" />
            <Input label="REM (min)" type="number" value={form.rem_sleep_min} onChange={e => setForm(p => ({ ...p, rem_sleep_min: e.target.value }))} placeholder="105" />
            <Input label="Light (min)" type="number" value={form.light_sleep_min} onChange={e => setForm(p => ({ ...p, light_sleep_min: e.target.value }))} placeholder="210" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="HRV (ms)" type="number" step="0.1" value={form.hrv_avg} onChange={e => setForm(p => ({ ...p, hrv_avg: e.target.value }))} placeholder="58" />
            <Input label="Resting HR (bpm)" type="number" value={form.resting_hr} onChange={e => setForm(p => ({ ...p, resting_hr: e.target.value }))} placeholder="52" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Respiratory Rate" type="number" step="0.1" value={form.respiratory_rate} onChange={e => setForm(p => ({ ...p, respiratory_rate: e.target.value }))} placeholder="15.2" />
            <Input label="Body Battery (%)" type="number" value={form.body_battery_start} onChange={e => setForm(p => ({ ...p, body_battery_start: e.target.value }))} placeholder="85" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Steps" type="number" value={form.steps} onChange={e => setForm(p => ({ ...p, steps: e.target.value }))} placeholder="10000" />
            <Input label="SpO2 (%)" type="number" step="0.1" value={form.spo2_avg} onChange={e => setForm(p => ({ ...p, spo2_avg: e.target.value }))} placeholder="97" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
