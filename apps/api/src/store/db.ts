import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'xemd.db');
export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Secrets table
db.exec(`
  CREATE TABLE IF NOT EXISTS secrets (
    widget_id TEXT NOT NULL,
    key       TEXT NOT NULL,
    value     TEXT NOT NULL,
    PRIMARY KEY (widget_id, key)
  );
`);

// Widget settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS widget_settings (
    widget_id TEXT PRIMARY KEY,
    settings  TEXT NOT NULL DEFAULT '{}'
  );
`);

// Widget enabled/disabled state
db.exec(`
  CREATE TABLE IF NOT EXISTS widget_state (
    widget_id TEXT PRIMARY KEY,
    enabled   INTEGER NOT NULL DEFAULT 1
  );
`);
