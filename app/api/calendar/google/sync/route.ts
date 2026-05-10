import { NextResponse } from "next/server";
import { dbGet, dbRun, initSchema } from "@/lib/db";

async function getGoogleAccessToken(): Promise<string | null> {
  const row = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'google_tokens'");
  if (!row) return null;
  try {
    const data = JSON.parse(row.value);
    if (data.expires_at && Date.now() > data.expires_at - 60_000) {
      return refreshToken(data.refresh_token);
    }
    return data.access_token ?? null;
  } catch { return null; }
}

async function refreshToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await dbRun(
      "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('google_tokens', ?, unixepoch())",
      [JSON.stringify({ ...data, refresh_token: refreshToken, expires_at: Date.now() + (data.expires_in ?? 3600) * 1000 })]
    );
    return data.access_token;
  } catch { return null; }
}

function mapEventType(summary: string): string {
  const s = summary.toLowerCase();
  if (/workout|gym|training|sport|run|swim|yoga|fitness|crossfit/.test(s)) return "workout";
  if (/meal|dinner|lunch|breakfast|cook|food|restaurant/.test(s)) return "nutrition";
  if (/doctor|arzt|health|zahnarzt|dentist|physio|klinik/.test(s)) return "health";
  if (/study|learn|course|uni|school|lesen|read/.test(s)) return "learning";
  if (/finance|tax|steuer|bank|invest|budget/.test(s)) return "finance";
  return "personal";
}

export async function POST() {
  await initSchema();

  const token = await getGoogleAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Google Calendar not connected. Connect it in Settings." }, { status: 401 });
  }

  try {
    const now = new Date();
    const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?timeMin=${now.toISOString()}&timeMax=${in60days.toISOString()}` +
      `&singleEvents=true&orderBy=startTime&maxResults=250`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error(`Google API ${res.status}`);
    const { items = [] } = await res.json();

    let synced = 0;
    for (const item of items) {
      if (!item.summary || item.status === "cancelled") continue;

      const startDate: string = item.start?.date ?? item.start?.dateTime?.slice(0, 10);
      const endDate: string | null = item.end?.date ?? item.end?.dateTime?.slice(0, 10) ?? null;
      const time: string | null = item.start?.dateTime ? item.start.dateTime.slice(11, 16) : null;
      const endTime: string | null = item.end?.dateTime ? item.end.dateTime.slice(11, 16) : null;
      if (!startDate) continue;

      const existing = await dbGet<{ id: number }>(
        "SELECT id FROM calendar_events WHERE google_event_id = ?",
        [item.id]
      );

      if (existing) {
        await dbRun(
          "UPDATE calendar_events SET title=?, date=?, end_date=?, time=?, end_time=?, type=?, notes=? WHERE google_event_id=?",
          [item.summary, startDate, endDate, time, endTime, mapEventType(item.summary), item.description ?? null, item.id]
        );
      } else {
        await dbRun(
          "INSERT INTO calendar_events (title, date, end_date, time, end_time, type, notes, source, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'google', ?)",
          [item.summary, startDate, endDate, time, endTime, mapEventType(item.summary), item.description ?? null, item.id]
        );
      }
      synced++;
    }

    return NextResponse.json({ synced });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
