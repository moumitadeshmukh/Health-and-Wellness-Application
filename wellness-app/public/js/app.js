// App shell: routing, auth guard, layout, notifications and reminders.
import { get, post, patch, setUnauthorizedHandler } from './api.js';
import { esc, icon, $, modal, toast, today } from './ui.js';

const PAGES = {
  landing: () => import('./pages/landing.js'),
  auth: () => import('./pages/auth.js'),
  onboarding: () => import('./pages/onboarding.js'),
  dashboard: () => import('./pages/dashboard.js'),
  bmi: () => import('./pages/bmi.js'),
  recipes: () => import('./pages/recipes.js'),
  tracker: () => import('./pages/tracker.js'),
  exercises: () => import('./pages/exercises.js'),
  workout: () => import('./pages/workout.js'),
  workouts: () => import('./pages/workouts.js'),
  progress: () => import('./pages/progress.js'),
  coach: () => import('./pages/coach.js'),
  settings: () => import('./pages/settings.js'),
};

const ROUTES = [
  ['/', 'landing', { public: true }],
  ['/login', 'auth', { public: true, mode: 'login' }],
  ['/register', 'auth', { public: true, mode: 'register' }],
  ['/forgot', 'auth', { public: true, mode: 'forgot' }],
  ['/onboarding', 'onboarding', { bare: true }],
  ['/dashboard', 'dashboard'],
  ['/bmi', 'bmi'],
  ['/recipes', 'recipes', { view: 'search' }],
  ['/recipes/saved', 'recipes', { view: 'saved' }],
  ['/recipes/:id', 'recipes', { view: 'detail' }],
  ['/tracker', 'tracker'],
  ['/tracker/:tab', 'tracker'],
  ['/exercises', 'exercises', { view: 'list', public: true, openShell: true }],
  ['/exercises/:id', 'exercises', { view: 'detail', public: true, openShell: true }],
  ['/challenge', 'workouts', { public: true, openShell: true, focus: 'challenge' }],
  ['/workouts', 'workouts', { public: true, openShell: true }],
  ['/workouts/:id', 'workouts', { public: true, openShell: true }],
  ['/workout', 'workout', { view: 'planner' }],
  ['/workout/history', 'workout', { view: 'history' }],
  ['/progress', 'progress'],
  ['/coach', 'coach'],
  ['/settings', 'settings'],
  ['/settings/:tab', 'settings'],
];

const NAV = [
  ['/dashboard', 'Dashboard', 'home'],
  ['/recipes', 'Recipes', 'chef'],
  ['/bmi', 'BMI & Weight', 'scale'],
  ['/tracker', 'Daily Tracker', 'activity'],
  ['/workouts', 'Workouts', 'play'],
  ['/exercises', 'Exercises', 'dumbbell'],
  ['/workout', 'Workout Planner', 'calendar'],
  ['/progress', 'Progress Reports', 'chart'],
  ['/coach', 'Chat with Tiara', 'chat'],
];

export const state = { me: null };
let cleanup = null;
let renderToken = 0;

function matchRoute(pathname) {
  for (const [pattern, page, opts = {}] of ROUTES) {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}/?$`);
    const m = pathname.match(re);
    if (m) {
      const params = {};
      keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { page, opts, params };
    }
  }
  return null;
}

export function navigate(to, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', to); else history.pushState({}, '', to);
  render();
}

export async function refreshMe() {
  try { state.me = await get('/users/me'); } catch { state.me = null; }
  return state.me;
}

setUnauthorizedHandler(() => {
  state.me = null;
  if (!matchRoute(location.pathname)?.opts.public) navigate('/login', { replace: true });
});

function isActive(href) {
  const p = location.pathname;
  return p === href || (href !== '/' && p.startsWith(`${href}/`));
}

function shellHtml() {
  const name = state.me?.profile?.name || '';
  const links = NAV.map(([href, text, ic]) => `<a class="nav-link" href="${href}" ${isActive(href) ? 'aria-current="page"' : ''}>${icon(ic)}<span>${text}</span></a>`).join('');
  const bottom = [['/dashboard', 'Home', 'home'], ['/workouts', 'Workouts', 'play'], ['/tracker', 'Tracker', 'activity'], ['/exercises', 'Exercises', 'dumbbell']]
    .map(([href, text, ic]) => `<a href="${href}" ${isActive(href) ? 'aria-current="page"' : ''}>${icon(ic)}<span>${text}</span></a>`).join('');
  const moreActive = ['/bmi', '/recipes', '/workout', '/progress', '/coach', '/settings'].some((h) => h === '/workout' ? location.pathname === '/workout' || location.pathname.startsWith('/workout/') : isActive(h));
  return `
  <div class="shell">
    <aside class="sidebar" aria-label="Main navigation">
      <a class="brand" href="/dashboard"><img src="/icon.svg" alt="">WellnessApp</a>
      <nav>${links}</nav>
      <div class="spacer"></div>
      <div class="nav-sep"></div>
      <a class="nav-link" href="/settings" ${isActive('/settings') ? 'aria-current="page"' : ''}>${icon('settings')}<span>Profile & Settings</span></a>
      <button class="nav-link" id="logout-btn" style="border:0;background:none;cursor:pointer;width:100%">${icon('logout')}<span>Sign out</span></button>
    </aside>
    <div class="main">
      <header class="topbar">
        <a class="brand mobile-brand" href="/dashboard"><img src="/icon.svg" alt="">WellnessApp</a>
        <div style="position:relative">
          <button class="icon-btn" id="bell" aria-label="Notifications" aria-haspopup="true">${icon('bell')}<span class="dot-badge" id="bell-count" hidden></span></button>
          <div id="notif-pop"></div>
        </div>
        <a class="icon-btn" href="/coach" aria-label="Chat with Tiara" title="Chat with Tiara">${icon('chat')}</a>
        <a class="icon-btn" href="/settings" aria-label="Profile and settings" title="${esc(name)}">${icon('settings')}</a>
      </header>
      <main class="content" id="main" tabindex="-1"></main>
    </div>
    ${location.pathname.startsWith('/coach') ? '' : `<a class="chat-fab" href="/coach" aria-label="Chat with Tiara"><img class="chat-fab-face" src="/tiara.svg" alt=""><span class="chat-fab-label">Ask Tiara</span><span class="chat-fab-icon">${icon('chat')}</span></a>`}
    <nav class="bottom-nav" aria-label="Main navigation">${bottom}<button id="more-btn" ${moreActive ? 'aria-current="page"' : ''}>${icon('more')}<span>More</span></button></nav>
  </div>`;
}

function publicShellHtml() {
  return `<div class="landing" style="min-height:100vh">
    <nav><a class="brand" href="/" style="padding:0"><img src="/icon.svg" alt="">WellnessApp</a>
      <div class="row"><a class="btn btn-ghost" href="/workouts">Workouts</a><a class="btn btn-ghost" href="/exercises">Exercises</a><a class="btn btn-ghost" href="/#bmi-check">BMI check</a><a class="btn btn-ghost" href="/login">Sign in</a><a class="btn btn-primary" href="/register">Get started free</a></div></nav>
    <main class="content" id="main" tabindex="-1" style="margin:0 auto"></main></div>`;
}

function showTiaraGreeting() {
  let want = false;
  try { want = sessionStorage.getItem('wa-tiara-greet') === '1'; sessionStorage.removeItem('wa-tiara-greet'); } catch { /* ignore */ }
  if (!want || location.pathname.startsWith('/coach') || $('#tiara-pop')) return;
  const first = (state.me?.profile?.name || '').split(' ')[0];
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const chips = [['🥗 Healthy snacks', 'Suggest some healthy snacks'], ['🏃 Quick workout', 'Suggest a 20 minute workout'], ['😴 Better sleep', 'How can I sleep better?'], ['📊 Review my week', 'Review my week']];
  const pop = document.createElement('div');
  pop.id = 'tiara-pop'; pop.className = 'tiara-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Tiara, your wellness chat assistant');
  pop.innerHTML = `<div class="tiara-pop-head"><img class="avatar tiara md" src="/tiara.svg" alt=""><div><strong>Tiara</strong><div class="tiny muted">Your wellness assistant · online</div></div>
      <button class="icon-btn sm" id="tiara-close" aria-label="Close">${icon('x')}</button></div>
    <div class="bubble bot tiara-pop-msg">${hi}${first ? `, ${esc(first)}` : ''}! 👋 I'm <strong>Tiara</strong>.<br><strong>How can I help you today?</strong></div>
    <div class="chips">${chips.map(([l, q]) => `<button class="chip" data-tq="${esc(q)}">${l}</button>`).join('')}</div>
    <form class="tiara-pop-form" id="tiara-form"><label class="sr-only" for="tiara-q">Message Tiara</label><input class="input" id="tiara-q" placeholder="Type your question…" maxlength="500" autocomplete="off"><button class="btn btn-primary" aria-label="Send">${icon('send')}</button></form>`;
  document.body.appendChild(pop);
  const close = () => { pop.classList.add('closing'); setTimeout(() => pop.remove(), 200); };
  const ask = (q) => { if (!q.trim()) return; pop.remove(); navigate(`/coach?q=${encodeURIComponent(q.trim())}`); };
  pop.querySelector('#tiara-close').addEventListener('click', close);
  pop.querySelectorAll('[data-tq]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.tq)));
  pop.querySelector('#tiara-form').addEventListener('submit', (e) => { e.preventDefault(); ask(pop.querySelector('#tiara-q').value); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
}

function wireShell() {
  setTimeout(showTiaraGreeting, 700);
  $('#logout-btn')?.addEventListener('click', logout);
  $('#more-btn')?.addEventListener('click', () => {
    const items = [['/recipes', 'Recipes', 'chef'], ['/bmi', 'BMI & Weight', 'scale'], ['/workout', 'Workout Planner', 'calendar'], ['/progress', 'Progress Reports', 'chart'], ['/coach', 'Chat with Tiara', 'chat'], ['/settings', 'Settings', 'settings']];
    modal(`${items.map(([h, t, i]) => `<a class="nav-link" href="${h}" data-close>${icon(i)}<span>${t}</span></a>`).join('')}<button class="nav-link" id="sheet-logout" style="border:0;background:none;width:100%;cursor:pointer">${icon('logout')}<span>Sign out</span></button>`, {
      sheet: true, onMount: (el, close) => { el.querySelector('#sheet-logout').addEventListener('click', () => { close(); logout(); }); },
    });
  });
  $('#bell')?.addEventListener('click', toggleNotifications);
  updateBell();
}

async function logout() {
  try { await post('/auth/logout'); } catch { /* ignore */ }
  state.me = null;
  navigate('/', { replace: true });
}

async function updateBell() {
  try {
    const res = await (await fetch('/api/v1/notifications', { credentials: 'same-origin' })).json();
    const n = res.meta?.unread || 0;
    const b = $('#bell-count');
    if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; }
  } catch { /* ignore */ }
}

async function toggleNotifications() {
  const pop = $('#notif-pop');
  if (pop.innerHTML) { pop.innerHTML = ''; return; }
  let list = [];
  try { list = await get('/notifications'); } catch { /* ignore */ }
  pop.innerHTML = `<div class="popover" role="dialog" aria-label="Notifications">
    <div class="row between" style="padding:12px 14px;border-bottom:1px solid var(--border)"><strong>Notifications</strong>${list.some((n) => !n.is_read) ? '<button class="btn btn-ghost btn-sm" id="read-all">Mark all read</button>' : ''}</div>
    ${list.length ? `<ul class="list">${list.map((n) => `<li class="${n.is_read ? '' : 'unread'}"><div class="grow"><strong class="small">${esc(n.title)}</strong><div class="small muted">${esc(n.body)}</div><div class="tiny muted">${new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div></div></li>`).join('')}</ul>` : '<div class="empty" style="margin:14px">You\'re all caught up.</div>'}
    <div style="padding:10px 14px;border-top:1px solid var(--border)"><a href="/settings/reminders" class="small">Manage reminders</a></div></div>`;
  $('#read-all')?.addEventListener('click', async () => { await post('/notifications/read-all'); pop.innerHTML = ''; updateBell(); });
  setTimeout(() => document.addEventListener('click', function closer(e) { if (!pop.contains(e.target) && e.target.closest('#bell') === null) { pop.innerHTML = ''; document.removeEventListener('click', closer); } }), 0);
}

// ---------- reminders: checked every 30s while the app is open ----------
const REMINDER_TEXT = {
  water: ['Time for some water 💧', 'A glass of water now helps you reach your hydration goal.'],
  meal: ['Log your meal 🍽️', 'Take a moment to record what you ate.'],
  movement: ['Movement break 🚶', 'Stand up, stretch or take a short walk.'],
  workout: ['Workout time 💪', "Your workout plan is ready when you are."],
  bedtime: ['Wind down for bed 🌙', 'Dim the screens and get ready for restful sleep.'],
  weight_log: ['Log your weight ⚖️', 'A quick weigh-in keeps your trend chart up to date.'],
  progress_review: ['Review your progress 📈', 'See how your week is going.'],
};
let reminderTimer = null;
function startReminders() {
  if (reminderTimer) return;
  const fired = new Set();
  const tick = async () => {
    if (!state.me) return;
    let list = [];
    try { list = await get('/reminders'); } catch { return; }
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const day = now.getDay();
    for (const r of list) {
      if (!r.is_enabled || r.scheduled_time !== hhmm) continue;
      if (r.frequency === 'weekdays' && (day === 0 || day === 6)) continue;
      if (r.frequency === 'weekends' && day > 0 && day < 6) continue;
      const key = `${r.id}:${today()}:${hhmm}`;
      if (fired.has(key)) continue;
      fired.add(key);
      const [title, body] = REMINDER_TEXT[r.reminder_type] || ['Reminder', ''];
      const text = r.label || body;
      try { await post('/notifications', { title, body: text }); } catch { /* ignore */ }
      if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body: text, icon: '/icon.svg' }); } catch { /* ignore */ } }
      toast(`${title} — ${text}`);
      updateBell();
    }
  };
  reminderTimer = setInterval(tick, 30_000);
  tick();
}

export async function render() {
  const token = ++renderToken;
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  const url = new URL(location.href);
  const match = matchRoute(url.pathname);
  const app = $('#app');
  if (!match) {
    app.innerHTML = `<div class="auth-bg"><div class="card" style="max-width:420px;text-align:center"><h1>Page not found</h1><p class="muted">That page doesn't exist.</p><a class="btn btn-primary" href="/dashboard">Go to dashboard</a></div></div>`;
    return;
  }
  if (state.me === null) await refreshMe();
  if (token !== renderToken) return;

  if (match.opts.public) {
    if (state.me && (match.page === 'landing' || match.opts.mode === 'login' || match.opts.mode === 'register')) {
      return navigate(state.me.onboarded ? '/dashboard' : '/onboarding', { replace: true });
    }
  } else {
    if (!state.me) return navigate('/login', { replace: true });
    if (!state.me.onboarded && match.page !== 'onboarding') return navigate('/onboarding', { replace: true });
    startReminders();
  }

  let root;
  if (match.opts.openShell && state.me?.onboarded) {
    startReminders();
    app.innerHTML = shellHtml();
    wireShell();
    root = $('#main');
  } else if (match.opts.openShell) {
    app.innerHTML = publicShellHtml();
    root = $('#main');
  } else if (match.opts.public || match.opts.bare) {
    app.innerHTML = '<div id="page"></div>';
    root = $('#page');
  } else {
    app.innerHTML = shellHtml();
    wireShell();
    root = $('#main');
  }
  const mod = await PAGES[match.page]();
  if (token !== renderToken) return;
  const ctx = { root, params: match.params, query: url.searchParams, opts: match.opts, me: state.me, navigate, refreshMe, updateBell };
  try {
    cleanup = (await mod.render(ctx)) || null;
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="banner error">${icon('alert')}<div>${esc(e.message || 'Something went wrong loading this page.')}</div></div>`;
  }
  const title = { landing: '', auth: match.opts.mode === 'register' ? 'Create account' : 'Sign in' }[match.page];
  document.title = title === '' ? 'WellnessApp' : `${title || match.page[0].toUpperCase() + match.page.slice(1)} · WellnessApp`;
  window.scrollTo(0, 0);
}

// Intercept internal link clicks for SPA navigation
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const href = a.getAttribute('href');
  if (!href.startsWith('/') || href.startsWith('/api/')) return;
  e.preventDefault();
  if (a.hasAttribute('data-close')) document.querySelector('.overlay')?.remove();
  navigate(href);
});
window.addEventListener('popstate', render);

// Expose for pages that patch the profile and need the shell to refresh
export const api = { get, post, patch };

// Privacy notice on first visit (spec: cookie/analytics consent). Only an essential sign-in cookie is used.
function showConsent() {
  let seen = false;
  try { seen = localStorage.getItem('wa-consent') === '1'; } catch { /* ignore */ }
  if (seen) return;
  const el = document.createElement('div');
  el.className = 'consent';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Privacy notice');
  el.innerHTML = `<strong>Your privacy</strong><p class="small muted mt-s">WellnessApp uses one essential cookie to keep you signed in. There are no advertising or analytics cookies, and your health data is stored only on this computer.</p><div class="row" style="justify-content:flex-end"><a class="btn btn-ghost btn-sm" href="/settings/privacy">Privacy settings</a><button class="btn btn-primary btn-sm" id="consent-ok">Got it</button></div>`;
  document.body.appendChild(el);
  el.querySelector('#consent-ok').addEventListener('click', () => { try { localStorage.setItem('wa-consent', '1'); } catch { /* ignore */ } el.remove(); });
}

if ('serviceWorker' in navigator && location.hostname) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is optional */ });
}

render();
showConsent();
