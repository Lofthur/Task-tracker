import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const file = process.env.DB_FILE ?? path.join(import.meta.dirname, '..', 'data', 'tracker.db')
if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true })

export const db = new DatabaseSync(file)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    hourly_rate REAL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id         INTEGER PRIMARY KEY,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    ended_at   TEXT,
    note       TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_entries_started ON time_entries(started_at);
  CREATE INDEX IF NOT EXISTS idx_entries_task ON time_entries(task_id);
  -- At most one running timer at a time.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_one_running ON time_entries((1)) WHERE ended_at IS NULL;
`)
