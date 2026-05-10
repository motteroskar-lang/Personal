import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(dateStr: string, fmt = "EEE, MMM d"): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getWeekDays(date = new Date()): string[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));
}

export function urgencyColor(urgency: string): string {
  switch (urgency) {
    case "critical": return "text-danger";
    case "high": return "text-warning";
    case "medium": return "text-text-secondary";
    default: return "text-text-tertiary";
  }
}

export function urgencyBg(urgency: string): string {
  switch (urgency) {
    case "critical": return "bg-danger/10 border-danger/30";
    case "high": return "bg-warning/10 border-warning/30";
    case "medium": return "bg-surface border-white/6";
    default: return "bg-surface/50 border-white/4";
  }
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    fitness: "#6BE3A4",
    nutrition: "#F2C063",
    learning: "#60A5FA",
    financial: "#A78BFA",
    personal: "#FB923C",
    health: "#34D399",
    discipline: "#F472B6",
  };
  return map[category] ?? "#76746E";
}

export function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    fitness: "🏋️",
    nutrition: "🥗",
    learning: "📚",
    financial: "💰",
    personal: "🎯",
    health: "❤️",
    discipline: "🔥",
    strength: "💪",
    cardio: "🏃",
    rest: "😴",
  };
  return map[category] ?? "⚡";
}

export function moodEmoji(mood: number): string {
  if (mood >= 9) return "🔥";
  if (mood >= 7) return "😊";
  if (mood >= 5) return "😐";
  if (mood >= 3) return "😔";
  return "😞";
}

export function hrvStatus(hrv: number): { label: string; color: string } {
  if (hrv >= 70) return { label: "Excellent", color: "#6BE3A4" };
  if (hrv >= 55) return { label: "Good", color: "#A3E635" };
  if (hrv >= 40) return { label: "Moderate", color: "#F2C063" };
  return { label: "Low", color: "#FF6B6B" };
}

export function sleepQualityLabel(min: number): string {
  const h = min / 60;
  if (h >= 8) return "Optimal";
  if (h >= 7) return "Good";
  if (h >= 6) return "Okay";
  if (h >= 5) return "Poor";
  return "Critical";
}

export function bodyBatteryColor(pct: number): string {
  if (pct >= 75) return "#6BE3A4";
  if (pct >= 50) return "#F2C063";
  if (pct >= 25) return "#FB923C";
  return "#FF6B6B";
}

export function progressPercent(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export function daysUntil(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseISO(deadline);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const SPENDING_CATEGORIES = [
  "food", "transport", "entertainment", "shopping", "health",
  "subscriptions", "utilities", "rent", "savings", "investment",
  "fitness", "travel", "education", "other"
];

export function parseRevolutCSV(csv: string): Array<{
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: string;
}> {
  const lines = csv.trim().split("\n");
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 6) continue;

    const amount = parseFloat(cols[5]) || 0;
    results.push({
      date: cols[0] ? format(new Date(cols[0]), "yyyy-MM-dd") : todayStr(),
      description: cols[4] || "Unknown",
      amount: Math.abs(amount),
      currency: cols[7] || "EUR",
      type: amount < 0 ? "expense" : "income",
    });
  }
  return results;
}
