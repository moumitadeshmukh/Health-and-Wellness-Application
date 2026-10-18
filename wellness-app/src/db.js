// Tiny JSON-file database. Everything lives in data/db.json and is written atomically.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

const COLLECTIONS = [
  'users', 'profiles', 'weight_records', 'step_records', 'water_entries', 'meal_logs',
  'sleep_records', 'last_meals', 'saved_recipes', 'recipe_history', 'workout_plans',
  'workout_sessions', 'reminders', 'notifications', 'ai_conversations', 'ai_feedback',
  'custom_foods', 'password_resets',
];

const file = () => path.join(config.dataDir, 'db.json');
let state = null;
let writeTimer = null;

function empty() {
  const s = {};
  for (const c of COLLECTIONS) s[c] = [];
  return s;
}

export function load({ reset = false } = {}) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (reset && fs.existsSync(file())) {
    fs.copyFileSync(file(), file() + `.backup-${Date.now()}`);
    fs.rmSync(file());
  }
  if (fs.existsSync(file())) {
    try {
      state = JSON.parse(fs.readFileSync(file(), 'utf8'));
    } catch (e) {
      const bad = file() + `.corrupt-${Date.now()}`;
      fs.renameSync(file(), bad);
      console.error(`db.json could not be read; moved it to ${bad} and started fresh.`);
      state = empty();
    }
  } else {
    state = empty();
  }
  for (const c of COLLECTIONS) if (!Array.isArray(state[c])) state[c] = [];
  flushNow();
}

function flushNow() {
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file());
}

function scheduleWrite() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try { flushNow(); } catch (e) { console.error('Failed to save data:', e.message); }
  }, 50);
}

export function flush() {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  flushNow();
}

export const uuid = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

export const db = {
  all(c) { return state[c]; },
  where(c, pred) { return state[c].filter(pred); },
  find(c, pred) { return state[c].find(pred); },
  byId(c, id) { return state[c].find((r) => r.id === id); },
  insert(c, record) {
    const row = { id: uuid(), created_at: nowIso(), ...record };
    state[c].push(row);
    scheduleWrite();
    return row;
  },
  update(c, id, patch) {
    const row = state[c].find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updated_at: nowIso() });
    scheduleWrite();
    return row;
  },
  remove(c, pred) {
    const before = state[c].length;
    state[c] = state[c].filter((r) => !pred(r));
    if (state[c].length !== before) scheduleWrite();
    return before - state[c].length;
  },
  touch() { scheduleWrite(); },
  collections: COLLECTIONS,
};
