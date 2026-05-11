import Anthropic from "@anthropic-ai/sdk";
import { dbGet } from "./db";

export async function getAIClient(): Promise<Anthropic> {
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return new Anthropic({ apiKey: envKey });

  const row = await dbGet<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'anthropic_api_key'"
  );
  if (!row?.value) {
    throw new Error("ANTHROPIC_API_KEY nicht konfiguriert. Settings → AI & API Keys → Anthropic Key eintragen.");
  }
  return new Anthropic({ apiKey: row.value });
}

export async function generateDailyPlan(context: {
  goals: Array<{ title: string; category: string; urgency: string; current_value?: number; target_value?: number; deadline?: string }>;
  recentHealth?: { sleep_duration_min?: number; hrv_avg?: number; resting_hr?: number; body_battery_start?: number };
  recentWorkouts?: Array<{ name: string; date: string }>;
  nutrition?: { calories: number; protein: number };
  screenTime?: { total_minutes: number };
  todayDate: string;
  wakeTime?: string;
  sleepTime?: string;
}): Promise<{ tasks: string[]; insight: string; urgentAlert?: string }> {
  const client = await getAIClient();

  const systemPrompt = `You are a ruthless personal performance coach AI. You have full context of the user's health, fitness, nutrition, goals, and habits. You speak directly and hold them accountable. You calculate exactly what they need to do TODAY to stay on track for their long-term goals. You consider their recovery state (HRV, sleep) when recommending training intensity. You are specific with numbers.`;

  const wakeStr = context.wakeTime ?? "06:00";
  const sleepStr = context.sleepTime ?? "22:00";

  const userPrompt = `Today is ${context.todayDate}. Wake time: ${wakeStr}, Sleep time: ${sleepStr} (${Math.round((parseInt(sleepStr) - parseInt(wakeStr)) * 60 / 60)} usable hours). Based on this data, generate a prioritized daily action plan:

LONG-TERM GOALS:
${context.goals.map(g => `- [${g.urgency.toUpperCase()}] ${g.title} (${g.category}${g.deadline ? `, deadline: ${g.deadline}` : ""})`).join("\n")}

LAST NIGHT'S RECOVERY:
${context.recentHealth ? `- Sleep: ${Math.round((context.recentHealth.sleep_duration_min ?? 0) / 60 * 10) / 10}h | HRV: ${context.recentHealth.hrv_avg ?? "?"}ms | RHR: ${context.recentHealth.resting_hr ?? "?"}bpm | Body Battery: ${context.recentHealth.body_battery_start ?? "?"}` : "No health data yet"}

RECENT WORKOUTS: ${context.recentWorkouts?.map(w => w.name).join(", ") || "None logged"}

SCREEN TIME YESTERDAY: ${context.screenTime ? `${Math.round(context.screenTime.total_minutes / 60 * 10) / 10}h total` : "Unknown"}

Return a JSON object with exactly this shape:
{
  "tasks": ["specific task 1", "specific task 2", ...], // 5-8 concrete daily tasks
  "insight": "one powerful 1-2 sentence coaching insight",
  "urgentAlert": "optional alert if something critical needs attention, otherwise null"
}

Be specific. Include actual numbers (reps, sets, calories, hours). No fluff.`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { tasks: [], insight: text, urgentAlert: undefined };

  try {
    return JSON.parse(match[0]);
  } catch {
    return { tasks: [], insight: text, urgentAlert: undefined };
  }
}

export async function generateJournalInsight(entry: {
  content: string;
  mood?: number;
  energy?: number;
  date: string;
}): Promise<string> {
  const client = await getAIClient();

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{
      role: "user",
      content: `Analyze this journal entry and provide a 2-3 sentence coach insight that identifies patterns, highlights what's working, and gives one actionable recommendation. Be direct and honest.\n\nDate: ${entry.date}\nMood: ${entry.mood}/10\nEnergy: ${entry.energy}/10\n\nEntry:\n${entry.content}`,
    }],
  });

  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

export async function generateAIInsights(allData: {
  goals: Array<{ title: string; status: string; urgency: string }>;
  healthTrend: Array<{ date: string; hrv_avg?: number; sleep_duration_min?: number }>;
  workoutFrequency: number;
  avgCalories: number;
  financialHealth?: { savings_rate: number; top_category: string };
}): Promise<Array<{ type: string; content: string; priority: string; category?: string }>> {
  const client = await getAIClient();

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `You are an AI that monitors a person's health, fitness, nutrition, and financial data. Identify patterns and generate 3 specific, actionable insights. Be blunt.

Data summary:
- Goals: ${allData.goals.map(g => `${g.title} [${g.urgency}]`).join(", ")}
- HRV trend (last 7 days): ${allData.healthTrend.map(h => h.hrv_avg?.toFixed(0) ?? "?").join(", ")}ms
- Sleep trend: ${allData.healthTrend.map(h => h.sleep_duration_min ? (h.sleep_duration_min / 60).toFixed(1) : "?").join(", ")}h
- Workout frequency: ${allData.workoutFrequency} sessions/week
- Avg daily calories: ${allData.avgCalories} kcal
${allData.financialHealth ? `- Savings rate: ${allData.financialHealth.savings_rate}% | Top spend: ${allData.financialHealth.top_category}` : ""}

Return JSON array:
[{"type": "alert|insight|suggestion", "content": "...", "priority": "high|medium|low"}]`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "[]";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

// ── Universal Goal Plan ───────────────────────────────────────────────────────

export interface GoalPlan {
  personalityFit: string;
  fitLevel: "aligned" | "challenging" | "misaligned";
  phases: Array<{
    name: string;
    duration: string;
    focus: string;
    actions: string[];
  }>;
  weeklyCommitment: string;
  dailyAction: string;
  quickWins: string[];
  nextMilestone: string;
  biggestRisk: string;
  successMetric: string;
}

export async function generateGoalPlan(params: {
  category: string;
  goal: string;
  currentState: string;
  timeframe: string;
  motivation?: string;
  pastExperience?: string;
}): Promise<GoalPlan> {
  const client = await getAIClient();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You are a brutally honest life advisor and planning expert. You do NOT motivate — you assess and plan. You tell people what they need to hear, not what they want to hear. If a goal is unrealistic or doesn't fit the person, you say so clearly. Your plans are specific, numbered, and time-bound. No generic advice. No fluff.`,
    messages: [{
      role: "user",
      content: `Assess and plan this goal.

CATEGORY: ${params.category}
GOAL: ${params.goal}
CURRENT STATE: ${params.currentState}
TIMEFRAME: ${params.timeframe}
${params.motivation ? `MOTIVATION: ${params.motivation}` : ""}
${params.pastExperience ? `PAST EXPERIENCE: ${params.pastExperience}` : ""}

Return raw JSON only (no markdown, no code block):
{
  "personalityFit": "2-3 honest sentences assessing if this goal fits the person's described situation. Be direct — include both alignment and any red flags.",
  "fitLevel": "aligned|challenging|misaligned",
  "phases": [
    { "name": "Phase name", "duration": "X weeks", "focus": "what to focus on", "actions": ["specific action 1", "specific action 2", "specific action 3"] }
  ],
  "weeklyCommitment": "X hours/week",
  "dailyAction": "The single most important daily habit for this goal (one concrete sentence)",
  "quickWins": ["3 specific things to do THIS WEEK to get started — concrete, doable"],
  "nextMilestone": "First checkpoint: what does success look like in 30 days",
  "biggestRisk": "The most likely reason this fails — be honest",
  "successMetric": "How to measure if it's working (specific metric)"
}`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned invalid format");
  return JSON.parse(match[0]) as GoalPlan;
}

export async function generateTodayBriefing(plans: Array<{
  category: string;
  title: string;
  daily_action: string;
  next_milestone: string;
}>): Promise<string> {
  if (plans.length === 0) return "";
  const client = await getAIClient();

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `You are a sharp daily briefing AI. Given these active goals and today's actions, write ONE powerful sentence (max 25 words) that frames what today is really about. Be direct, no fluff.

Active goals:
${plans.map(p => `- ${p.category}: ${p.daily_action}`).join("\n")}

One sentence, present tense, action-oriented.`,
    }],
  });

  return msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
}

// ── Coach Targets ─────────────────────────────────────────────────────────────

export interface CoachTargets {
  // Cardio
  fiveK_current?: string;
  fiveK_target?: string;
  rhr_target?: number;
  weekly_km?: number;
  // Strength
  bench_current?: number;
  bench_target?: number;
  squat_current?: number;
  squat_target?: number;
  deadlift_current?: number;
  deadlift_target?: number;
  pullups_current?: number;
  pullups_target?: number;
  // Aesthetics
  weight_target?: number;
  body_fat_current?: number;
  body_fat_target?: number;
}

export interface CoachDayPlan {
  day: string;
  type: "training" | "rest" | "recovery";
  title: string;
  details: string;
  nutrition: string;
}

export interface CoachingPlan {
  assessment: string;
  timeToGoal: string;
  weekPlan: CoachDayPlan[];
  weeklyFocus: string;
  nutritionTargets: { calories: number; protein: number; carbs: number; fat: number; note: string };
  recoveryNotes: string;
  keyMetric: string;
}

export async function generateCoachingPlan(params: {
  focus: "strength" | "aesthetics" | "cardio";
  targets: CoachTargets;
  currentStats: {
    rhr?: number;
    hrv?: number;
    sleep_h?: number;
    weight?: number;
    body_fat?: number;
  };
  recentWorkouts: Array<{ name: string; type: string; date: string }>;
  nutrition7days: { avg_cal: number; avg_protein: number; avg_carbs: number; avg_fat: number };
  personalRecords: Array<{ exercise_name: string; value: number; unit: string }>;
}): Promise<CoachingPlan> {
  const client = await getAIClient();

  const focusDescriptions: Record<string, string> = {
    strength: "maximal strength via progressive overload and compound movements",
    aesthetics: "body recomposition through hypertrophy training and strategic nutrition",
    cardio: "cardiovascular performance through zone-based training and periodization",
  };

  const targetsLines = Object.entries(params.targets)
    .filter(([, v]) => v !== undefined && v !== "" && v !== 0)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  const userPrompt = `Generate a complete 7-day coaching plan for this athlete.

FOCUS: ${params.focus.toUpperCase()} — ${focusDescriptions[params.focus]}

TARGETS:
${targetsLines || "  None specified"}

CURRENT RECOVERY STATE:
  RHR: ${params.currentStats.rhr ?? "unknown"}bpm
  HRV: ${params.currentStats.hrv ?? "unknown"}ms
  Sleep last night: ${params.currentStats.sleep_h != null ? params.currentStats.sleep_h.toFixed(1) + "h" : "unknown"}
  Body weight: ${params.currentStats.weight ?? "unknown"}kg${params.currentStats.body_fat != null ? `\n  Body fat: ${params.currentStats.body_fat}%` : ""}

RECENT TRAINING (last 10 sessions):
${params.recentWorkouts.length > 0 ? params.recentWorkouts.map(w => `  ${w.date}: ${w.name} (${w.type})`).join("\n") : "  No sessions logged yet"}

NUTRITION (7-day average):
  Calories: ${params.nutrition7days.avg_cal} kcal/day
  Protein: ${params.nutrition7days.avg_protein}g | Carbs: ${params.nutrition7days.avg_carbs}g | Fat: ${params.nutrition7days.avg_fat}g

PERSONAL RECORDS:
${params.personalRecords.length > 0 ? params.personalRecords.map(pr => `  ${pr.exercise_name}: ${pr.value}${pr.unit}`).join("\n") : "  None logged"}

Return a JSON object with EXACTLY this structure (no markdown, raw JSON only):
{
  "assessment": "2-3 sentences: honest assessment of current state vs goal, what the biggest limiter is",
  "timeToGoal": "realistic timeframe e.g. '12-16 weeks with consistent execution'",
  "weekPlan": [
    { "day": "Monday", "type": "training", "title": "short title", "details": "exact prescription: sets x reps @ weight, or pace/distance for cardio", "nutrition": "specific nutrition note for this day" },
    { "day": "Tuesday", "type": "rest", "title": "Rest / Active Recovery", "details": "...", "nutrition": "..." },
    { "day": "Wednesday", "type": "training", "title": "...", "details": "...", "nutrition": "..." },
    { "day": "Thursday", "type": "training", "title": "...", "details": "...", "nutrition": "..." },
    { "day": "Friday", "type": "training", "title": "...", "details": "...", "nutrition": "..." },
    { "day": "Saturday", "type": "training", "title": "...", "details": "...", "nutrition": "..." },
    { "day": "Sunday", "type": "recovery", "title": "...", "details": "...", "nutrition": "..." }
  ],
  "weeklyFocus": "the ONE thing to nail this week",
  "nutritionTargets": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "note": "one sentence rationale" },
  "recoveryNotes": "specific protocol based on current HRV/RHR data",
  "keyMetric": "what to measure daily this week and why"
}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: `You are an elite performance coach. You specialize in ${focusDescriptions[params.focus]}. Give specific, numbered, data-driven coaching. No fluff. Use exact numbers (sets, reps, kg, km, pace per km). Be direct and demanding.`,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned invalid response format");
  return JSON.parse(match[0]) as CoachingPlan;
}

export async function chatWithAI(message: string, context: string): Promise<string> {
  const client = await getAIClient();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: `You are Personal OS, an AI performance coach with full access to the user's health, fitness, nutrition, financial, and goal data. You speak directly, give specific advice, and hold the user accountable. Context: ${context}`,
    messages: [{ role: "user", content: message }],
  });

  return msg.content[0].type === "text" ? msg.content[0].text : "";
}
