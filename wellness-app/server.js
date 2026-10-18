// WellnessApp local server. Run with:  node server.js   then open http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT, aiEnabled } from './src/config.js';
import { load, flush, db } from './src/db.js';
import { requireUser } from './src/auth.js';
import { readBody, sendJson, sendError, ApiError } from './src/http.js';
import { router } from './src/routes.js';

const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  console.error(`WellnessApp needs Node.js 18 or newer (you have ${process.versions.node}). Download the LTS version from https://nodejs.org`);
  process.exit(1);
}

load({ reset: process.argv.includes('--reset') });

const PUBLIC = path.join(ROOT, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  let target = file;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    // Single-page app: unknown paths without a file extension get index.html
    if (path.extname(rel)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    target = path.join(PUBLIC, 'index.html');
  }
  const ext = path.extname(target);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);

  try {
    if (!pathname.startsWith('/api/v1/')) throw new ApiError(404, 'NOT_FOUND', 'Unknown API version');
    const apiPath = pathname.slice('/api/v1'.length);
    const m = router.match(req.method, apiPath);
    if (!m) throw new ApiError(404, 'NOT_FOUND', `No endpoint ${req.method} ${apiPath}`);
    if (m.methodNotAllowed) throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${req.method} is not supported here`);
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // Basic CSRF protection: state-changing requests must come from this app's own origin.
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) throw new ApiError(403, 'FORBIDDEN', 'Cross-origin request blocked');
    }
    const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : {};
    const user = m.route.auth ? requireUser(req, db) : null;
    const result = await m.route.handler({ req, res, body, query: url.searchParams, params: m.params, user, ip: req.socket.remoteAddress });
    if (result?.handled) return;
    if (result.status === 204) { res.writeHead(204, result.headers || {}); return res.end(); }
    sendJson(res, result.status, result.body, result.headers);
  } catch (err) {
    if (res.headersSent) { try { res.end(); } catch { /* ignore */ } return; }
    sendError(res, err);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${config.port} is already in use. Close the other program using it, or start on another port, e.g.:\n  set PORT=3001 && node server.js   (Windows)\n  PORT=3001 node server.js          (macOS/Linux)\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

// Also answer on the IPv6 loopback (::1): some Windows browsers resolve "localhost" to it first.
if (config.host === '127.0.0.1') {
  const v6 = http.createServer((req, res) => server.emit('request', req, res));
  v6.on('error', () => { /* IPv6 unavailable or port taken on ::1 — IPv4 still works */ });
  v6.listen(config.port, '::1');
}

server.listen(config.port, config.host, () => {
  const url = `http://localhost:${config.port}`;
  console.log('\n  🌱 WellnessApp is running');
  console.log(`  ➜  Open: ${url}`);
  console.log(`  ➜  Data: ${path.join(config.dataDir, 'db.json')}`);
  console.log(`  ➜  AI assistant: ${aiEnabled() ? `Claude API (${config.aiModel})` : 'rule-based mode (add ANTHROPIC_API_KEY to .env to enable Claude)'}`);
  console.log('\n  Press Ctrl+C to stop.\n');
});

const shutdown = () => { try { flush(); } catch { /* ignore */ } process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
