import { createClient, type Client, type InArgs } from "@libsql/client";

let _client: Client | null = null;

export function getDb(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set. See .env.local.example");
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

// ── Typed helper wrappers (mimic better-sqlite3 API but async) ─────────────────

export async function dbGet<T>(sql: string, args: InArgs = []): Promise<T | null> {
  const db = getDb();
  const r = await db.execute({ sql, args });
  return (r.rows[0] as unknown as T) ?? null;
}

export async function dbAll<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const db = getDb();
  const r = await db.execute({ sql, args });
  return r.rows as unknown as T[];
}

export async function dbRun(
  sql: string,
  args: InArgs = []
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  const db = getDb();
  const r = await db.execute({ sql, args });
  return { lastInsertRowid: Number(r.lastInsertRowid ?? 0), rowsAffected: r.rowsAffected };
}

export async function dbExec(sql: string): Promise<void> {
  const db = getDb();
  // Split on semicolons, filter empty, execute as batch
  const stmts = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ sql: s, args: [] as InArgs }));
  await db.batch(stmts, "write");
}

// ── Schema initialisation (run once on first request) ─────────────────────────

let _initialized = false;

export async function initSchema(): Promise<void> {
  if (_initialized) return;

  const db = getDb();
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'personal',
        target_value REAL,
        current_value REAL DEFAULT 0,
        unit TEXT,
        deadline TEXT,
        urgency TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        queued INTEGER NOT NULL DEFAULT 0,
        goal_id INTEGER,
        ai_generated INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS health_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        sleep_start TEXT,
        sleep_end TEXT,
        sleep_duration_min INTEGER,
        sleep_score INTEGER,
        deep_sleep_min INTEGER,
        light_sleep_min INTEGER,
        rem_sleep_min INTEGER,
        awake_min INTEGER,
        hrv_avg REAL,
        hrv_overnight_avg REAL,
        resting_hr INTEGER,
        respiratory_rate REAL,
        body_battery_start INTEGER,
        body_battery_end INTEGER,
        stress_avg INTEGER,
        steps INTEGER,
        active_calories INTEGER,
        total_calories INTEGER,
        floors INTEGER,
        spo2_avg REAL,
        source TEXT DEFAULT 'manual',
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'strength',
        duration_min INTEGER,
        notes TEXT,
        garmin_activity_id TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        sets INTEGER NOT NULL,
        reps TEXT NOT NULL,
        weight REAL,
        weight_unit TEXT DEFAULT 'kg',
        rpe REAL,
        notes TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS personal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_name TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        date TEXT NOT NULL,
        exercise_id INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS food_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL DEFAULT 'snack',
        food_name TEXT NOT NULL,
        amount REAL,
        unit TEXT DEFAULT 'g',
        calories REAL NOT NULL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        fiber REAL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS nutrition_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calories INTEGER NOT NULL DEFAULT 2500,
        protein INTEGER NOT NULL DEFAULT 180,
        carbs INTEGER NOT NULL DEFAULT 250,
        fat INTEGER NOT NULL DEFAULT 80,
        updated_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        mood INTEGER,
        energy INTEGER,
        gratitude TEXT,
        wins TEXT,
        challenges TEXT,
        ai_insight TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        end_date TEXT,
        time TEXT,
        end_time TEXT,
        type TEXT DEFAULT 'personal',
        notes TEXT,
        recurring TEXT,
        goal_id INTEGER,
        source TEXT DEFAULT 'manual',
        google_event_id TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS finance_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'EUR',
        category TEXT DEFAULT 'other',
        account TEXT DEFAULT 'revolut',
        type TEXT NOT NULL DEFAULT 'expense',
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target REAL NOT NULL,
        current REAL DEFAULT 0,
        currency TEXT DEFAULT 'EUR',
        deadline TEXT,
        category TEXT DEFAULT 'savings',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS screen_time (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        total_minutes INTEGER DEFAULT 0,
        social_media_min INTEGER DEFAULT 0,
        productivity_min INTEGER DEFAULT 0,
        entertainment_min INTEGER DEFAULT 0,
        health_fitness_min INTEGER DEFAULT 0,
        app_breakdown TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS ai_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'insight',
        category TEXT,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        read INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL UNIQUE,
        current_count INTEGER DEFAULT 0,
        longest_count INTEGER DEFAULT 0,
        last_date TEXT,
        updated_at INTEGER DEFAULT (unixepoch())
      )`,
      `INSERT OR IGNORE INTO nutrition_goals (id, calories, protein, carbs, fat) VALUES (1, 2500, 180, 250, 80)`,
      `INSERT OR IGNORE INTO streaks (type, current_count, longest_count) VALUES ('daily_goals', 0, 0)`,
      `INSERT OR IGNORE INTO streaks (type, current_count, longest_count) VALUES ('workouts', 0, 0)`,
      `INSERT OR IGNORE INTO streaks (type, current_count, longest_count) VALUES ('journal', 0, 0)`,
    ].map((sql) => ({ sql, args: [] as InArgs })),
    "write"
  );

  // Column migrations for existing databases (ignore "duplicate column" errors)
  for (const sql of [
    "ALTER TABLE calendar_events ADD COLUMN source TEXT DEFAULT 'manual'",
    "ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT",
  ]) {
    try { await db.execute({ sql, args: [] }); } catch { /* already exists */ }
  }

  _initialized = true;
}
