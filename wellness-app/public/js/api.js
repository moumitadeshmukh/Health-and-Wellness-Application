// Thin wrapper over fetch for /api/v1 (cookie session).
export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details || []; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = 'GET', body, query, raw = false } = {}) {
  let url = `/api/v1${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    if ([...qs].length) url += `?${qs}`;
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the app server. Is it still running?');
  }
  if (raw) return res;
  if (res.status === 204) return null;
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const e = json?.error || {};
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, e.code || 'ERROR', e.message || `Request failed (${res.status})`, e.details);
  }
  return json;
}

export const get = (p, query) => api(p, { query }).then((r) => r.data);
export const getFull = (p, query) => api(p, { query });
export const post = (p, body = {}) => api(p, { method: 'POST', body }).then((r) => r?.data);
export const put = (p, body = {}) => api(p, { method: 'PUT', body }).then((r) => r?.data);
export const patch = (p, body = {}) => api(p, { method: 'PATCH', body }).then((r) => r?.data);
export const del = (p, body) => api(p, { method: 'DELETE', body });

// Server-Sent Events over POST for the chat stream.
export async function streamChat(body, { onMeta, onDelta, onDone }) {
  const res = await api('/ai/chat', { method: 'POST', body, raw: true });
  if (!res.ok) {
    let msg = 'The assistant is unavailable right now.';
    try { msg = (await res.json()).error.message; } catch { /* ignore */ }
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, 'AI_ERROR', msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = (chunk.match(/^event: (.*)$/m) || [])[1];
      const data = (chunk.match(/^data: (.*)$/m) || [])[1];
      if (!ev || !data) continue;
      const parsed = JSON.parse(data);
      if (ev === 'token' || ev === 'delta') onDelta?.(parsed.text); // 'delta' = older server versions
      else if (ev === 'meta') onMeta?.(parsed);
      else if (ev === 'done') { if (parsed.conversation_id) onMeta?.(parsed); onDone?.(parsed); }
      else if (ev === 'error') throw new ApiError(503, parsed.code || 'AI_UNAVAILABLE', parsed.message || 'AI assistant is temporarily unavailable.');
    }
  }
}
