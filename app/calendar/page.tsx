"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO } from "date-fns";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  end_date?: string;
  time?: string;
  type: string;
  notes?: string;
}

const EVENT_TYPES = [
  { value: "workout", label: "🏋️ Workout" },
  { value: "nutrition", label: "🥗 Meal Prep" },
  { value: "goal", label: "🎯 Goal Milestone" },
  { value: "health", label: "❤️ Health" },
  { value: "learning", label: "📚 Learning" },
  { value: "personal", label: "👤 Personal" },
  { value: "finance", label: "💰 Finance" },
  { value: "rest", label: "😴 Rest Day" },
];

const TYPE_COLORS: Record<string, string> = {
  workout: "#6BE3A4", nutrition: "#F2C063", goal: "#A78BFA",
  health: "#FF6B6B", learning: "#60A5FA", personal: "#FB923C",
  finance: "#34D399", rest: "#94A3B8",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "", type: "workout", notes: "" });

  const monthStr = format(currentMonth, "yyyy-MM");

  const load = useCallback(async () => {
    const res = await fetch(`/api/calendar?month=${monthStr}`);
    const data = await res.json();
    setEvents(data.events ?? []);
  }, [monthStr]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedDay) {
      const dayStr = format(selectedDay, "yyyy-MM-dd");
      const filtered = events.filter(e => {
        const start = e.date;
        const end = e.end_date ?? e.date;
        return dayStr >= start && dayStr <= end;
      });
      setDayEvents(filtered);
    }
  }, [selectedDay, events]);

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), time: "", type: "workout", notes: "" });
    await load();
  };

  const deleteEvent = async (id: number) => {
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
    await load();
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsByDate = events.reduce((acc: Record<string, CalendarEvent[]>, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1">Schedule & Planning</div>
          <h1 className="text-3xl font-bold tracking-[-0.025em] gradient-text">Calendar</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setForm(p => ({ ...p, date: format(selectedDay ?? new Date(), "yyyy-MM-dd") })); setModalOpen(true); }}>
            + Add Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="text-[#76746E] hover:text-[#FAFAFA] transition-colors px-2 py-1 rounded-lg hover:bg-white/5">‹</button>
              <h2 className="font-bold text-lg">{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="text-[#76746E] hover:text-[#FAFAFA] transition-colors px-2 py-1 rounded-lg hover:bg-white/5">›</button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(d => (
                <div key={d} className="text-center text-[10px] font-mono uppercase tracking-wider text-[#76746E] py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayEvs = eventsByDate[dateStr] ?? [];
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div key={dateStr} onClick={() => setSelectedDay(day)}
                    className={`relative p-1.5 rounded-xl cursor-pointer transition-colors min-h-[60px] ${isSelected ? "bg-white/10 border border-white/15" : "hover:bg-white/5"} ${!isCurrentMonth ? "opacity-30" : ""}`}>
                    <div className={`text-xs font-mono text-center w-6 h-6 flex items-center justify-center mx-auto rounded-full ${isToday ? "bg-[#6BE3A4] text-[#0A0A0B] font-bold" : "text-[#B8B6B0]"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvs.slice(0, 2).map(ev => (
                        <div key={ev.id} className="h-1.5 rounded-full" style={{ background: TYPE_COLORS[ev.type] ?? "#76746E" }} title={ev.title} />
                      ))}
                      {dayEvs.length > 2 && <div className="text-[8px] font-mono text-[#76746E] text-center">+{dayEvs.length - 2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Day detail */}
        <div className="space-y-3">
          {selectedDay && (
            <>
              <SectionTitle>{format(selectedDay, "EEEE, MMM d")}</SectionTitle>
              {dayEvents.length === 0 ? (
                <Card>
                  <div className="text-center py-6 text-[#76746E] text-sm">
                    <div className="text-3xl mb-2">📅</div>
                    Nothing scheduled.
                    <button onClick={() => { setForm(p => ({ ...p, date: format(selectedDay, "yyyy-MM-dd") })); setModalOpen(true); }}
                      className="block mx-auto mt-2 text-xs text-[#6BE3A4] hover:underline">
                      + Add event
                    </button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map(ev => (
                    <Card key={ev.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: TYPE_COLORS[ev.type] ?? "#76746E" }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{ev.title}</div>
                          {ev.time && <div className="text-xs font-mono text-[#76746E] mt-0.5">{ev.time}</div>}
                          {ev.notes && <p className="text-xs text-[#76746E] mt-1">{ev.notes}</p>}
                          <Badge variant="default" className="mt-2">{ev.type}</Badge>
                        </div>
                        <button onClick={() => deleteEvent(ev.id)} className="text-[#76746E] hover:text-[#FF6B6B] text-lg leading-none transition-colors">×</button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Upcoming events */}
          <SectionTitle>Upcoming</SectionTitle>
          <div className="space-y-2">
            {events
              .filter(ev => ev.date >= format(new Date(), "yyyy-MM-dd"))
              .slice(0, 5)
              .map(ev => (
                <div key={ev.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/6">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[ev.type] ?? "#76746E" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{ev.title}</div>
                    <div className="text-[10px] font-mono text-[#76746E]">{format(parseISO(ev.date), "EEE, MMM d")} {ev.time ? `· ${ev.time}` : ""}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Event">
        <form onSubmit={addEvent} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Leg Day" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <Input label="Time" type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
          </div>
          <Select label="Type" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Event</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
