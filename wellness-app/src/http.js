// Minimal router and response helpers that follow the API contract shapes.
import crypto from 'node:crypto';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new ApiError(400, 'VALIDATION_ERROR', message, details);
export const notFound = (what = 'Resource') => new ApiError(404, 'NOT_FOUND', `${what} not found`);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function sendJson(res, status, body, extraHeaders = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extraHeaders,
  });
  res.end(payload);
}

export function sendError(res, err) {
  const requestId = crypto.randomUUID();
  if (err instanceof ApiError) {
    return sendJson(res, err.status, {
      error: { code: err.code, message: err.message, details: err.details || [], request_id: requestId },
    });
  }
  console.error(`[${requestId}]`, err);
  return sendJson(res, 500, {
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', details: [], request_id: requestId },
  });
}

export async function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(badRequest('Request body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(badRequest('Body must be valid JSON')); }
    });
    req.on('error', reject);
  });
}

export function createRouter() {
  const routes = [];
  const add = (method, pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handler, auth: opts.auth !== false });
  };
  const match = (method, pathname) => {
    let pathMatched = false;
    for (const r of routes) {
      const m = pathname.match(r.re);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  };
  return {
    get: (p, h, o) => add('GET', p, h, o),
    post: (p, h, o) => add('POST', p, h, o),
    put: (p, h, o) => add('PUT', p, h, o),
    patch: (p, h, o) => add('PATCH', p, h, o),
    delete: (p, h, o) => add('DELETE', p, h, o),
    match,
  };
}

// ---- validation helpers -------------------------------------------------
export function num(body, field, { min, max, required = true, int = false } = {}) {
  const v = body[field];
  if (v === undefined || v === null || v === '') {
    if (required) throw badRequest(`${field} is required`, [{ field, issue: 'required' }]);
    return undefined;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest(`${field} must be a number`, [{ field, issue: 'must be a number' }]);
  if (int && !Number.isInteger(n)) throw badRequest(`${field} must be a whole number`, [{ field, issue: 'must be an integer' }]);
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    throw badRequest(`${field} must be between ${min} and ${max}`, [{ field, issue: `must be between ${min} and ${max}` }]);
  }
  return n;
}

export function str(body, field, { required = true, max = 500, oneOf } = {}) {
  const v = body[field];
  if (v === undefined || v === null || v === '') {
    if (required) throw badRequest(`${field} is required`, [{ field, issue: 'required' }]);
    return undefined;
  }
  if (typeof v !== 'string') throw badRequest(`${field} must be text`, [{ field, issue: 'must be a string' }]);
  const s = v.trim();
  if (s.length > max) throw badRequest(`${field} is too long`, [{ field, issue: `max ${max} characters` }]);
  if (oneOf && !oneOf.includes(s)) throw badRequest(`${field} must be one of: ${oneOf.join(', ')}`, [{ field, issue: 'invalid option' }]);
  return s;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function dateField(body, field, { required = true } = {}) {
  const v = body[field];
  if (!v) { if (required) throw badRequest(`${field} is required`, [{ field, issue: 'required' }]); return undefined; }
  if (!DATE_RE.test(v) || Number.isNaN(Date.parse(v))) throw badRequest(`${field} must be YYYY-MM-DD`, [{ field, issue: 'format YYYY-MM-DD' }]);
  return v;
}

export function timeField(body, field, { required = true } = {}) {
  const v = body[field];
  if (!v) { if (required) throw badRequest(`${field} is required`, [{ field, issue: 'required' }]); return undefined; }
  if (!TIME_RE.test(v)) throw badRequest(`${field} must be HH:MM (24-hour)`, [{ field, issue: 'format HH:MM' }]);
  return v;
}

export function paginate(list, query) {
  const page = Math.max(1, parseInt(query.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.get('limit') || '50', 10) || 50));
  return { data: list.slice((page - 1) * limit, page * limit), meta: { page, limit, total: list.length } };
}
