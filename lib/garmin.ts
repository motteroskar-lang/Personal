// Garmin Connect API integration
// Uses Garmin Health API (OAuth 1.0a)
// Setup: https://developer.garmin.com/health-api/overview/

import { dbGet } from "./db";

export interface GarminSleepData {
  calendarDate: string;
  durationInSeconds: number;
  startTimeLocal: string;
  endTimeLocal: string;
  deepSleepSeconds: number;
  lightSleepSeconds: number;
  remSleepSeconds: number;
  awakeSleepSeconds: number;
  averageSpO2Value: number;
  averageRespirationValue: number;
  lowestRespirationValue: number;
  highestRespirationValue: number;
  averageStressLevel: number;
  sleepScores: { overall: { value: number } };
}

export interface GarminHRVData {
  startTimestampLocal: string;
  endTimestampLocal: string;
  weeklyAvg: number;
  lastNight: number;
  lastFiveMinutesAvg: number;
  baseline: { lowUpper: number; balancedLow: number; balancedUpper: number };
  status: string;
  feedbackPhrase: string;
}

export interface GarminDailyData {
  calendarDate: string;
  totalSteps: number;
  activeKilocalories: number;
  totalKilocalories: number;
  floorsAscended: number;
  restingHeartRate: number;
  maxHeartRate: number;
  bodyBatteryChargedValue: number;
  bodyBatteryDrainedValue: number;
  averageStressLevel: number;
  highStressDuration: number;
}

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";

export async function getGarminTokens(): Promise<{ token: string; secret: string } | null> {
  const row = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'garmin_tokens'");
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function fetchGarminSleep(date: string): Promise<GarminSleepData | null> {
  const tokens = await getGarminTokens();
  if (!tokens) return null;

  try {
    const res = await fetch(`${GARMIN_API_BASE}/sleep/${date}`, {
      headers: {
        Authorization: buildOAuthHeader(tokens.token, tokens.secret, "GET", `${GARMIN_API_BASE}/sleep/${date}`),
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sleeps?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchGarminHRV(date: string): Promise<GarminHRVData | null> {
  const tokens = await getGarminTokens();
  if (!tokens) return null;

  try {
    const res = await fetch(`${GARMIN_API_BASE}/hrv/${date}`, {
      headers: {
        Authorization: buildOAuthHeader(tokens.token, tokens.secret, "GET", `${GARMIN_API_BASE}/hrv/${date}`),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchGarminDaily(date: string): Promise<GarminDailyData | null> {
  const tokens = await getGarminTokens();
  if (!tokens) return null;

  try {
    const res = await fetch(`${GARMIN_API_BASE}/dailies/${date}`, {
      headers: {
        Authorization: buildOAuthHeader(tokens.token, tokens.secret, "GET", `${GARMIN_API_BASE}/dailies/${date}`),
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.dailies?.[0] ?? null;
  } catch {
    return null;
  }
}

// Simplified OAuth 1.0a header builder
function buildOAuthHeader(token: string, secret: string, method: string, url: string): string {
  const consumerKey = process.env.GARMIN_CONSUMER_KEY ?? "";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2);

  // Placeholder — use oauth-1.0a library for a complete HMAC-SHA1 signature
  void secret; void method; void url;
  return `OAuth oauth_consumer_key="${consumerKey}", oauth_token="${token}", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_signature_method="HMAC-SHA1", oauth_version="1.0"`;
}

export function getGarminAuthUrl(): string {
  const consumerKey = process.env.GARMIN_CONSUMER_KEY ?? "";
  const callbackUrl = process.env.GARMIN_CALLBACK_URL ?? "http://localhost:3000/api/garmin/callback";
  return `https://connect.garmin.com/oauthConfirm?oauth_token=${consumerKey}&oauth_callback=${encodeURIComponent(callbackUrl)}`;
}
