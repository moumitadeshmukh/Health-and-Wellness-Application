// "Timed workouts" builder: pick a category, 30–45 min and a work/rest timing, preview, then Start.
import { getFull, post } from './api.js';
import { esc, icon, toast, toastError, withBusy } from './ui.js';
import { demoThumb } from './demo.js';

const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
const fmtSecs = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

export async function mountIntervalBuilder(el, { level: lv = 'beginner', loggedIn = false, compact = false } = {}) {
  let opts;
  try { opts = (await getFull('/workouts/intervals')).data; } catch (e) { el.innerHTML = `<div class="banner error">${esc(e.message)}</div>`; return; }
  const remembered = (() => { try { return JSON.parse(localStorage.getItem('wa-interval') || '{}'); } catch { return {}; } })();
  const st = { theme: remembered.theme || 'full-body-hiit', duration: remembered.duration || 30, format: remembered.format || 'mixed', level: remembered.level || lv };
  if (!opts.themes.some((t) => t.id === st.theme)) st.theme = opts.themes[0].id;
  let reqToken = 0;

  el.innerHTML = `<div class="card iv-card">
    <div class="card-head" style="margin-bottom:4px"><h2 style="margin:0">⏱ Timed workouts · 30–45 min</h2></div>
    <p class="small muted" style="margin-top:0">Choose a category, length and timing. Press <strong>Start</strong> — exercises play one after another with a countdown clock (for example <strong>30 s exercise → 15 s rest</strong>), with warm-up and cool-down included.</p>
    <div class="label">1 · Category</div>
    <div class="cat-scroll" id="iv-themes">${opts.themes.map((t) => `<button type="button" class="cat-card" data-ivtheme="${t.id}"><span class="emoji">${t.emoji}</span><strong class="small">${esc(t.title)}</strong></button>`).join('')}</div>
    <div class="iv-row">
      <div><div class="label">2 · Length</div><div class="chips" id="iv-dur">${opts.durations.map((d) => `<button type="button" class="chip" data-ivdur="${d}">${d} min</button>`).join('')}</div></div>
      <div><div class="label">3 · Timing</div><div class="chips" id="iv-fmt">${opts.formats.map((f) => `<button type="button" class="chip" data-ivfmt="${f.id}" title="${esc(f.hint)}">${esc(f.label)}</button>`).join('')}</div></div>
      <div><div class="label">4 · Level</div><div class="chips" id="iv-lvl">${LEVELS.map(([k, l]) => `<button type="button" class="chip" data-ivlvl="${k}">${l}</button>`).join('')}</div></div>
    </div>
    <div id="iv-preview" class="iv-preview" aria-live="polite"></div>
  </div>`;
  const q = (s) => el.querySelector(s);

  const sync = () => {
    const theme = opts.themes.find((t) => t.id === st.theme);
    if (!theme.durations.includes(st.duration)) st.duration = theme.durations[0];
    el.querySelectorAll('[data-ivtheme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ivtheme === st.theme)));
    el.querySelectorAll('[data-ivdur]').forEach((b) => { b.setAttribute('aria-pressed', String(Number(b.dataset.ivdur) === st.duration)); b.disabled = !theme.durations.includes(Number(b.dataset.ivdur)); });
    el.querySelectorAll('[data-ivfmt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ivfmt === st.format)));
    el.querySelectorAll('[data-ivlvl]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ivlvl === st.level)));
    try { localStorage.setItem('wa-interval', JSON.stringify(st)); } catch { /* ignore */ }
    preview();
  };

  async function preview() {
    const token = ++reqToken;
    const id = `iv-${st.theme}-${st.duration}-${st.format}-${st.level}`;
    q('#iv-preview').innerHTML = '<div class="skeleton loading-block" style="height:180px"></div>';
    let w;
    try { w = (await getFull(`/workouts/interval/${id}`)).data; } catch (e) { if (token === reqToken) q('#iv-preview').innerHTML = `<div class="banner error">${esc(e.message)}</div>`; return; }
    if (token !== reqToken) return;
    const main = w.exercises.filter((x) => x.phase === 'main');
    const warm = w.exercises.filter((x) => x.phase === 'warmup');
    const cool = w.exercises.filter((x) => x.phase === 'cooldown');
    const roundSecs = main.reduce((t, x) => t + x.work_seconds + x.rest_seconds, 0);
    // One round drawn as a strip: coloured blocks = exercise, grey = rest.
    const strip = main.map((x) => `<span class="iv-work" style="flex:${x.work_seconds}" title="${esc(x.name)} · ${x.work_seconds} s"></span><span class="iv-rest" style="flex:${x.rest_seconds}" title="Rest ${x.rest_seconds} s"></span>`).join('');
    q('#iv-preview').innerHTML = `
      <div class="iv-summary">
        <div><h3 style="margin:0">${esc(w.emoji)} ${esc(w.title)} · ${w.duration_min} min</h3><p class="small muted" style="margin:2px 0 0">${esc(w.blurb)}</p></div>
        <div class="iv-facts">
          <span><strong>${main.length}</strong> exercises</span><span><strong>${w.rounds}</strong> rounds</span>
          <span><strong>${esc(w.work_range)}</strong> each</span><span><strong>${w.round_rest} s</strong> between rounds</span><span>≈ <strong>${w.est_total_minutes}</strong> min total</span>
        </div>
      </div>
      <div class="small muted mt-s">One round (${Math.round(roundSecs / 60 * 10) / 10} min) — <span class="iv-key work"></span> exercise <span class="iv-key rest"></span> rest</div>
      <div class="iv-strip">${strip}</div>
      <div class="iv-timeline ${compact ? 'compact' : ''}">
        <div class="iv-phase"><strong>🔥 Warm-up</strong> <span class="tiny muted">${warm.length} moves · ${warm[0]?.work_seconds || 40} s each</span></div>
        <div class="iv-phase"><strong>💪 Main circuit</strong> <span class="tiny muted">${main.length} exercises × ${w.rounds} rounds</span></div>
        <ol class="iv-list">${main.map((x, k) => `<li><span class="gl-num">${k + 1}</span><span class="gl-thumb">${demoThumb(x.exercise_id, x.equipment)}</span><span class="grow small"><strong>${esc(x.name)}</strong></span><span class="iv-pill work">${fmtSecs(x.work_seconds)}</span><span class="iv-pill rest">${x.rest_seconds} s rest</span></li>`).join('')}</ol>
        <div class="tiny muted" style="padding-left:6px">↻ Repeat ${w.rounds}× with a ${w.round_rest} s break between rounds</div>
        <div class="iv-phase"><strong>🧘 Cool-down</strong> <span class="tiny muted">${cool.length} stretches · ${cool[0]?.work_seconds || 40} s each</span></div>
      </div>
      ${w.notes.length ? `<p class="tiny muted">${w.notes.map(esc).join(' ')}</p>` : ''}
      <div class="row mt" style="gap:8px">
        <a class="btn btn-primary btn-lg" href="/workouts/${w.id}">${icon('play')}Start workout</a>
        ${loggedIn ? `<button class="btn btn-secondary" id="iv-save">${icon('calendar')}Save to my plans</button>` : ''}
        <button class="btn btn-ghost" id="iv-shuffle" title="Show a different category">🔀 Surprise me</button>
      </div>`;
    q('#iv-save')?.addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
      try { await post('/workout-plans/from-ready', { workout_id: w.id }); toast('Saved as your active plan ✓'); } catch (err) { toastError(err); }
    }));
    q('#iv-shuffle').addEventListener('click', () => {
      const others = opts.themes.filter((t) => t.id !== st.theme);
      st.theme = others[Math.floor(Math.random() * others.length)].id; sync();
      el.querySelector(`[data-ivtheme="${st.theme}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  }

  el.querySelectorAll('[data-ivtheme]').forEach((b) => b.addEventListener('click', () => { st.theme = b.dataset.ivtheme; sync(); }));
  el.querySelectorAll('[data-ivdur]').forEach((b) => b.addEventListener('click', () => { st.duration = Number(b.dataset.ivdur); sync(); }));
  el.querySelectorAll('[data-ivfmt]').forEach((b) => b.addEventListener('click', () => { st.format = b.dataset.ivfmt; sync(); }));
  el.querySelectorAll('[data-ivlvl]').forEach((b) => b.addEventListener('click', () => { st.level = b.dataset.ivlvl; sync(); }));
  sync();
}
