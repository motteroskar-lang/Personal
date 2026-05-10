import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/personal.db";
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Long-term goals (fitness, financial, learning, personal)
    CREATE TABLE IF NOT EXISTS goals (
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
    );

    -- Daily tasks (AI-generated or user-added)
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      queued INTEGER NOT NULL DEFAULT 0,
      goal_id INTEGER REFERENCES goals(id),
      ai_generated INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Sleep & health from Garmin / manual
    CREATE TABLE IF NOT EXISTS health_data (
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
    );

    -- Workout sessions
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'strength',
      duration_min INTEGER,
      notes TEXT,
      garmin_activity_id TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Individual exercises in a workout (for progressive overload)
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sets INTEGER NOT NULL,
      reps TEXT NOT NULL,
      weight REAL,
      weight_unit TEXT DEFAULT 'kg',
      rpe REAL,
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Personal records
    CREATE TABLE IF NOT EXISTS personal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      date TEXT NOT NULL,
      exercise_id INTEGER REFERENCES exercises(id),
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Food log (calorie & macro tracking)
    CREATE TABLE IF NOT EXISTS food_log (
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
    );

    -- Nutrition goals
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calories INTEGER NOT NULL DEFAULT 2500,
      protein INTEGER NOT NULL DEFAULT 180,
      carbs INTEGER NOT NULL DEFAULT 250,
      fat INTEGER NOT NULL DEFAULT 80,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Journal entries
    CREATE TABLE IF NOT EXISTS journal_entries (
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
    );

    -- Calendar events
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      end_date TEXT,
      time TEXT,
      end_time TEXT,
      type TEXT DEFAULT 'personal',
      notes TEXT,
      recurring TEXT,
      goal_id INTEGER REFERENCES goals(id),
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Finance transactions
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      category TEXT DEFAULT 'other',
      account TEXT DEFAULT 'revolut',
      type TEXT NOT NULL DEFAULT 'expense',
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Financial goals
    CREATE TABLE IF NOT EXISTS financial_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      current REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      deadline TEXT,
      category TEXT DEFAULT 'savings',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Screen time log (manual or imported)
    CREATE TABLE IF NOT EXISTS screen_time (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_minutes INTEGER DEFAULT 0,
      social_media_min INTEGER DEFAULT 0,
      productivity_min INTEGER DEFAULT 0,
      entertainment_min INTEGER DEFAULT 0,
      health_fitness_min INTEGER DEFAULT 0,
      app_breakdown TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- AI insights & alerts
    CREATE TABLE IF NOT EXISTS ai_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'insight',
      category TEXT,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Streak tracking
    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE,
      current_count INTEGER DEFAULT 0,
      longest_count INTEGER DEFAULT 0,
      last_date TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Seed default nutrition goals if empty
    INSERT OR IGNORE INTO nutrition_goals (id, calories, protein, carbs, fat)
    VALUES (1, 2500, 180, 250, 80);

    -- Seed default streaks
    INSERT OR IGNORE INTO streaks (type, current_count, longest_count)
    VALUES ('daily_goals', 0, 0),
           ('workouts', 0, 0),
           ('journal', 0, 0);
  `);
}

export default getDb;
