// Local email/password auth: scrypt-hashed passwords + HMAC-signed session cookies.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { ApiError } from './http.js';

const ACCESS_TTL_S = 60 * 60 * 24 * 7; // 7 days
const COOKIE = 'wa_session';
let secret;

function getSecret() {
  if (secret) return secret;
  const f = path.join(config.dataDir, 'secret.key');
  fs.mkdirSync(config.dataDir, { recursive: true });
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'));
  secret = fs.readFileSync(f, 'utf8').trim();
  return secret;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = String(stored).split('$');
  if (!saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash);
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

export function createToken(user) {
  const payload = b64(JSON.stringify({ sub: user.id, sv: user.session_version || 0, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_S }));
  return `${payload}.${sign(payload)}`;
}

export function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp < Date.now() / 1000) return null;
    return data;
  } catch { return null; }
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ACCESS_TTL_S}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

export function tokenFromRequest(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return parseCookies(req)[COOKIE];
}

export function requireUser(req, db) {
  const data = readToken(tokenFromRequest(req));
  const user = data && db.byId('users', data.sub);
  if (!user || (user.session_version || 0) !== data.sv) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  }
  return user;
}

// Simple in-memory rate limiter for auth endpoints (per IP).
const attempts = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > max) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.');
  }
}
