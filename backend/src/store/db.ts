import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

/**
 * Durable state: prepaid balances, spent payment proofs (anti-replay), and
 * receipts. Prompts and completions are never written here.
 */
let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const file = config.databasePath;
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS prepaid_keys (
      key_hash      TEXT PRIMARY KEY,
      key_prefix    TEXT NOT NULL,
      wallet        TEXT NOT NULL,
      balance_micro INTEGER NOT NULL,
      spent_micro   INTEGER NOT NULL DEFAULT 0,
      requests      INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      last_used_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spent_payments (
      id         TEXT PRIMARY KEY,
      kind       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id         TEXT PRIMARY KEY,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

/** For tests: drop the handle so the next call reopens the file. */
export function closeDb() {
  db?.close();
  db = null;
}

export const toMicro = (usdc: number) => Math.round(usdc * 1_000_000);
export const fromMicro = (micro: number) => micro / 1_000_000;
