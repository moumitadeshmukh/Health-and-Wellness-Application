// Shared UI helpers: escaping, formatting, icons, toasts, modals, charts, markdown.

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function shiftDate(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export const nowTime = () => new Date().toTimeString().slice(0, 5);
export const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN'));
export const fmtMin = (m) => (m === null || m === undefined ? '—' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`);
export const fmtDate = (d, opts = { day: 'numeric', month: 'short' }) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-IN', opts);
};
export const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};
export const label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const pct = (v, goal) => Math.max(0, Math.min(100, goal ? Math.round((v / goal) * 100) : 0));
export function elapsedSince(dateStr, timeStr) {
  if (!timeStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const diff = Math.round((Date.now() - new Date(y, m - 1, d, h, mi).getTime()) / 60000);
  return diff < 0 ? null : diff;
}

// ---------- icons (Lucide-style paths) ----------
const P = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  chef: '<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 9.18 0A4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/>',
  scale: '<path d="M16 16.5 19 9l3 7.5a3.5 3.5 0 0 1-6 0Z"/><path d="M2 16.5 5 9l3 7.5a3.5 3.5 0 0 1-6 0Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  dumbbell: '<path d="m6.5 6.5 11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  footprints: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0ZM20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4M4 13h4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  thumbsUp: '<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  thumbsDown: '<path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
};
export const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;

// ---------- toasts / modals ----------
export function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}
export const toastError = (e) => toast(e?.message || 'Something went wrong', 'error');

export function modal(html, { onMount, onClose, className = 'modal', sheet = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = `overlay ${sheet ? 'sheet-overlay' : ''}`;
  overlay.innerHTML = `<div class="${sheet ? 'sheet' : className}" role="dialog" aria-modal="true">${html}</div>`;
  const prevFocus = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    overlay.remove(); document.removeEventListener('keydown', onKey); prevFocus?.focus?.(); onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  const first = overlay.querySelector('input, select, textarea, button');
  first?.focus();
  onMount?.(overlay.firstElementChild, close);
  return close;
}

export function confirmDialog(message, { okText = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    let answer = false;
    modal(`<h2>Are you sure?</h2><p>${esc(message)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-secondary" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cf-ok">${esc(okText)}</button></div>`, {
      onMount: (el, c) => { el.querySelector('#cf-ok').addEventListener('click', () => { answer = true; c(); }); },
      onClose: () => resolve(answer),
    });
  });
}

export async function withBusy(btn, fn, busyText) {
  if (btn.disabled) return;
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${busyText ? esc(busyText) : html}`;
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}

export const skeleton = (n = 3, cls = 'grid-3') => `<div class="grid ${cls}">${'<div class="skeleton loading-block"></div>'.repeat(n)}</div>`;
export const errorBox = (e, retry = true) => `<div class="banner error">${icon('alert')}<div><strong>Couldn't load this section.</strong><br>${esc(e.message)}${retry ? ' <button class="btn btn-sm btn-secondary mt-s" data-retry>Try again</button>' : ''}</div></div>`;
export const progressBar = (value, color = '') => `<div class="progress ${color}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div>`;

// ---------- markdown-lite (for chat) ----------
export function md(text) {
  const lines = esc(text).split('\n');
  let html = ''; let inList = false;
  const inline = (s) => s.replace(/\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g, (_, t, u) => `<a href="${u}"${u.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_(.+?)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>').replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    html += h ? `<p><strong>${inline(h[1])}</strong></p>` : `<p>${inline(line)}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

// ---------- charts (SVG, responsive via viewBox) ----------
const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

export function lineChart(points, { color = '#16A34A', height = 200, unit = '', goal, min: forcedMin, fmt = (v) => fmtNum(v) } = {}) {
  const W = 600; const H = height; const pad = { l: 44, r: 12, t: 12, b: 26 };
  const vals = points.map((p) => p.value).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return '<div class="empty small">No data recorded for this period yet.</div>';
  let lo = forcedMin ?? Math.min(...vals, goal ?? Infinity);
  let hi = Math.max(...vals, goal ?? -Infinity);
  if (forcedMin === undefined) { const span = Math.max(1, hi - lo); lo = Math.max(0, lo - span * 0.2); hi += span * 0.2; }
  else hi = niceMax(hi * 1.1);
  const x = (i) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo || 1));
  let path = ''; let started = false;
  points.forEach((p, i) => { if (p.value === null || p.value === undefined) { started = false; return; } path += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`; started = true; });
  const ticks = 4;
  let grid = '';
  for (let k = 0; k <= ticks; k++) {
    const v = lo + ((hi - lo) * k) / ticks; const yy = y(v);
    grid += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"/><text x="${pad.l - 6}" y="${yy + 4}" text-anchor="end">${esc(fmt(Math.round(v * 10) / 10))}</text>`;
  }
  const every = Math.ceil(points.length / 7);
  const xl = points.map((p, i) => (i % every === 0 || i === points.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>` : '')).join('');
  const dots = points.map((p, i) => (p.value === null || p.value === undefined ? '' : `<circle cx="${x(i)}" cy="${y(p.value)}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"><title>${esc(p.label)}: ${esc(fmt(p.value))}${unit}</title></circle>`)).join('');
  const goalLine = goal ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="#F59E0B" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - pad.r}" y="${y(goal) - 5}" text-anchor="end" style="fill:#92400E">Goal</text>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">${grid}${goalLine}<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}${xl}</svg>`;
}

export function barChart(points, { color = '#0EA5E9', height = 200, goal, unit = '', fmt = (v) => fmtNum(v) } = {}) {
  const W = 600; const H = height; const pad = { l: 44, r: 12, t: 12, b: 26 };
  const vals = points.map((p) => p.value || 0);
  if (!vals.some((v) => v > 0)) return '<div class="empty small">No data recorded for this period yet.</div>';
  const hi = niceMax(Math.max(...vals, goal || 0) * 1.05);
  const bw = (W - pad.l - pad.r) / points.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / hi);
  let grid = '';
  for (let k = 0; k <= 4; k++) { const v = (hi * k) / 4; grid += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`; }
  const every = Math.ceil(points.length / 10);
  const bars = points.map((p, i) => {
    const v = p.value || 0; const bx = pad.l + i * bw + bw * 0.18; const w = bw * 0.64;
    const met = goal && v >= goal;
    return `<rect x="${bx}" y="${y(v)}" width="${w}" height="${Math.max(0, H - pad.b - y(v))}" rx="${Math.min(4, w / 2)}" fill="${met ? '#16A34A' : color}"><title>${esc(p.label)}: ${esc(fmt(v))}${unit}</title></rect>${i % every === 0 || i === points.length - 1 ? `<text x="${bx + w / 2}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>` : ''}`;
  }).join('');
  const goalLine = goal ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal)}" y2="${y(goal)}" stroke="#F59E0B" stroke-dasharray="5 4" stroke-width="1.5"/>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${grid}${bars}${goalLine}</svg>`;
}

export function ring(value, { size = 120, stroke = 12, color = '#16A34A', labelHtml = '' } = {}) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, value));
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${v}% complete"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke:var(--subtle)" stroke-width="${stroke}" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .5s"/></svg><div class="ring-label">${labelHtml}</div></div>`;
}

export function sparkline(values, color = '#16A34A') {
  const v = values.map((x) => (x === null || x === undefined ? null : Number(x)));
  const present = v.filter((x) => x !== null);
  if (present.length < 2) return '<span class="tiny muted">Not enough data yet</span>';
  const lo = Math.min(...present); const hi = Math.max(...present);
  const W = 120; const H = 32;
  let d = ''; let started = false;
  v.forEach((x, i) => { if (x === null) { started = false; return; } const px = (i * W) / (v.length - 1); const py = H - 3 - ((x - lo) / (hi - lo || 1)) * (H - 6); d += `${started ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`; started = true; });
  return `<svg viewBox="0 0 ${W} ${H}" width="120" height="32" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export const ENUM_LABELS = {
  fitness_goal: { weight_loss: 'Weight loss', weight_maintenance: 'Weight maintenance', muscle_toning: 'Muscle toning', stamina_improvement: 'Stamina improvement', general_wellness: 'General wellness' },
  activity_level: { sedentary: 'Sedentary', lightly_active: 'Lightly active', moderately_active: 'Moderately active', very_active: 'Very active' },
  dietary_preference: { vegetarian: 'Vegetarian', vegan: 'Vegan', non_vegetarian: 'Non-vegetarian', eggetarian: 'Eggetarian', other: 'Other' },
  exercise_intensity: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
  gender: { female: 'Female', male: 'Male', non_binary: 'Non-binary', other: 'Other', prefer_not_to_say: 'Prefer not to say' },
  meal_type: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', beverage: 'Beverage' },
};
export const options = (map, selected) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');
export const BMI_LABEL = { underweight: 'Underweight', healthy_weight: 'Healthy weight', overweight: 'Overweight', obesity: 'Obesity' };
export const BMI_COLOR = { underweight: 'blue', healthy_weight: 'beginner', overweight: 'intermediate', obesity: 'advanced' };

// ---------- form drafts (spec mockup: "Draft restored") ----------
// Stored only in this browser; passwords are never saved.
const draftKey = (k) => `wa-draft:${k}`;
export function saveDraft(key, data) { try { localStorage.setItem(draftKey(key), JSON.stringify(data)); } catch { /* storage unavailable */ } }
export function loadDraft(key) { try { return JSON.parse(localStorage.getItem(draftKey(key)) || 'null'); } catch { return null; } }
export function clearDraft(key) { try { localStorage.removeItem(draftKey(key)); } catch { /* ignore */ } }

/** Restores saved values into the given input ids, shows a "Draft restored" banner, and keeps saving as the user types. */
export function wireDraft(form, key, ids, root = document) {
  if (!form) return;
  const draft = loadDraft(key);
  const get = (id) => root.querySelector(`#${id}`);
  if (draft && ids.some((id) => draft[id])) {
    for (const id of ids) if (draft[id] !== undefined && get(id) && !get(id).value) get(id).value = draft[id];
    const b = document.createElement('div');
    b.className = 'banner success mb';
    b.innerHTML = `${icon('check')}<div class="grow">Draft restored — your previous details have been loaded.</div><button type="button" class="icon-btn sm" aria-label="Dismiss and clear draft">${icon('x')}</button>`;
    b.querySelector('button').addEventListener('click', () => { clearDraft(key); b.remove(); });
    form.prepend(b);
  }
  form.addEventListener('input', () => {
    const data = {};
    for (const id of ids) if (get(id)) data[id] = get(id).value;
    saveDraft(key, data);
  });
}

// ---------- theme ----------
export function getThemePref() { try { return localStorage.getItem('wa-theme') || 'light'; } catch { return 'light'; } }
export function setThemePref(pref) {
  try { localStorage.setItem('wa-theme', pref); } catch { /* ignore */ }
  const resolved = pref === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref;
  document.documentElement.dataset.theme = resolved;
}
