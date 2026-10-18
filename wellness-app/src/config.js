// Loads settings from the optional .env file next to server.js, then from real environment variables.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '127.0.0.1',
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || 'data'),
  anthropicKey: (process.env.ANTHROPIC_API_KEY || '').trim(),
  aiModel: process.env.AI_MODEL || 'claude-sonnet-5-5',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 30000,
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT) || 50,
};

export const aiEnabled = () => Boolean(config.anthropicKey);

// Save the AI settings into .env (keeps any other lines) and apply them immediately.
export function saveAiSettings({ key, model }) {
  const file = path.join(ROOT, '.env');
  let lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const set = (name, value) => {
    const i = lines.findIndex((l) => l.trim().startsWith(`${name}=`));
    const line = `${name}=${value}`;
    if (i >= 0) lines[i] = line; else lines.push(line);
  };
  set('ANTHROPIC_API_KEY', key || '');
  if (model) set('AI_MODEL', model);
  lines = lines.filter((l, i) => l !== '' || i < lines.length - 1);
  fs.writeFileSync(file, `${lines.join('\n').replace(/\n+$/, '')}\n`);
  config.anthropicKey = key || '';
  if (model) config.aiModel = model;
}
