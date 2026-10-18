// Ready-made workouts (20 / 30 / 45 min) and the guided player page.
import { get, getFull, post } from '../api.js';
import { esc, icon, $, skeleton, errorBox, toast, toastError, withBusy, label } from '../ui.js';
import { demoThumb } from '../demo.js';
import { mountGuided } from '../guided.js';
import { mountIntervalBuilder } from '../intervals-ui.js';
import { mountChallenge } from './challenge.js';

const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];

export async function render(ctx) {
  return ctx.params.id ? detail(ctx) : list(ctx);
}

async function list(ctx) {
  const { root, me, query } = ctx;
  let level = query.get('level') || me?.profile?.exercise_intensity || 'beginner';
  let duration = Number(query.get('duration')) || 0;
  const draw = async () => {
    root.innerHTML = `
      <div class="page-head"><div><h1>Workouts</h1><p>Ready-made workouts with several exercises — press Start once and follow along. No need to pick exercises one by one.</p></div>
        ${me ? `<a class="btn btn-secondary" href="/workout">${icon('calendar')}Build my own plan</a>` : ''}</div>
      <div id="chal" class="mb"></div>
      <div id="drw" class="mb"></div>
      <div id="pfw" class="mb"></div>
      <div id="ivb" class="mb"></div>
      <h2 class="mt" id="classic">Classic workouts · 20 / 30 / 45 min</h2>
      <div class="card mb"><div class="row between">
        <div><span class="label">Your level</span><div class="chips mt-s">${LEVELS.map(([k, l]) => `<button class="chip" data-level="${k}" aria-pressed="${k === level}">${l}</button>`).join('')}</div></div>
        <div><span class="label">Workout length</span><div class="chips mt-s">${[[0, 'All'], [20, '20 min'], [30, '30 min'], [45, '45 min']].map(([d, l]) => `<button class="chip" data-dur="${d}" aria-pressed="${d === duration}">${l}</button>`).join('')}</div></div>
      </div></div>
      <div id="wlist">${skeleton(6)}</div>
      <p class="disclaimer mt">Warm-up and cool-down are included in every workout. Stop if you feel pain, dizziness or chest discomfort. If you have a medical condition, injury or are pregnant, check with a healthcare professional first.</p>`;
    mountIntervalBuilder($('#ivb'), { level, loggedIn: Boolean(me) });
    drSection($('#drw'));
    pfSection($('#pfw'));
    mountChallenge($('#chal'), { me }).then(() => { if (ctx.opts.focus === 'challenge' || location.hash === '#challenge') $('#chal')?.scrollIntoView({ block: 'start' }); });
    root.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => { level = b.dataset.level; draw().then(() => $('#classic')?.scrollIntoView({ block: 'start' })); }));
    root.querySelectorAll('[data-dur]').forEach((b) => b.addEventListener('click', () => { duration = Number(b.dataset.dur); draw().then(() => $('#classic')?.scrollIntoView({ block: 'start' })); }));
    let items;
    try { items = (await getFull('/workouts/ready', { level })).data; } catch (e) { $('#wlist').innerHTML = errorBox(e, false); return; }
    if (duration) items = items.filter((w) => w.duration_min === duration);
    const themes = [...new Set(items.map((w) => w.theme))];
    const card = (w) => `
          <a class="card workout-card" href="/workouts/${w.id}">
            <div class="row between"><span class="duration-pill">${w.duration_min} min</span><span class="badge ${w.level}">${w.level}</span></div>
            <h3 class="mt-s" style="margin-bottom:2px">${esc(w.emoji)} ${esc(w.title)}</h3>
            <div class="small muted">${w.exercise_count} exercises · about ${w.est_total_minutes} min${w.rounds > 1 ? ` · ${w.rounds} rounds` : ''}</div>
            <ul class="small workout-preview">${w.preview.map((n) => `<li>${esc(n)}</li>`).join('')}${w.main_count > w.preview.length ? `<li class="muted">+ ${w.main_count - w.preview.length} more</li>` : ''}</ul>
            <span class="btn btn-primary btn-sm">${icon('play')}Start workout</span>
          </a>`;
    if (duration) { $('#wlist').innerHTML = items.length ? `<div class="grid grid-3">${items.map(card).join('')}</div>` : '<div class="empty">No workouts for this filter.</div>'; return; }
    $('#wlist').innerHTML = themes.map((t) => {
      const ws = items.filter((w) => w.theme === t);
      const first = ws[0];
      return `<section class="mb"><div class="row" style="gap:8px;margin:18px 0 8px"><span style="font-size:1.4rem">${first.emoji}</span><h2 style="margin:0">${esc(first.title)}</h2></div>
        <p class="small muted" style="margin-top:-4px">${esc(first.blurb)}</p>
        <div class="grid grid-3">${ws.map((w) => `
          <a class="card workout-card" href="/workouts/${w.id}">
            <div class="row between"><span class="duration-pill">${w.duration_min} min</span><span class="badge ${w.level}">${w.level}</span></div>
            <h3 class="mt-s" style="margin-bottom:2px">${esc(w.title)}</h3>
            <div class="small muted">${w.exercise_count} exercises · about ${w.est_total_minutes} min${w.rounds > 1 ? ` · ${w.rounds} rounds` : ''}</div>
            <ul class="small workout-preview">${w.preview.map((n) => `<li>${esc(n)}</li>`).join('')}${w.main_count > w.preview.length ? `<li class="muted">+ ${w.main_count - w.preview.length} more</li>` : ''}</ul>
            <span class="btn btn-primary btn-sm">${icon('play')}Start workout</span>
          </a>`).join('')}</div></section>`;
    }).join('') || '<div class="empty">No workouts for this filter.</div>';
  };
  await draw();
}

// Diastasis recti follow-along workouts (postnatal core).
async function drSection(el) {
  let list;
  try { list = (await getFull('/workouts/dr')).data; } catch { el.innerHTML = ''; return; }
  const [std, gentle] = list;
  el.innerHTML = `<section class="card dr-card">
    <div class="dr-head">
      <div class="dr-badge">🫶 Postnatal core</div>
      <h2 style="margin:6px 0 4px">Diastasis Recti Workouts</h2>
      <p class="small muted" style="margin:0">Heal ab separation by rebuilding your deep core and obliques. Follow along — each move is timed, with a short pause to switch. Aim for <strong>twice a week</strong>.</p>
    </div>
    <div class="dr-grid">
      ${[gentle, std].map((w) => `<a class="dr-option ${w.level}" href="/workouts/${w.id}">
        <div class="row between"><span class="duration-pill">~${w.est_total_minutes + 1} min</span><span class="badge ${w.level}">${w.level === 'beginner' ? 'Start here' : 'Standard'}</span></div>
        <h3 style="margin:8px 0 2px">${esc(w.emoji)} ${esc(w.title.replace('Diastasis Recti · ', ''))}</h3>
        <p class="small muted" style="margin:0 0 8px">${esc(w.blurb)}</p>
        <ol class="dr-moves">${w.moves.map((m) => `<li>${esc(m.name)}</li>`).join('')}</ol>
        <span class="btn btn-primary btn-sm">${icon('play')}Start · ${esc(w.format_label)}</span>
      </a>`).join('')}
    </div>
    <p class="tiny muted" style="margin:10px 0 0">Start only after your doctor clears you — usually around 6–8 weeks after a vaginal birth or 8–10 weeks after a C-section — and begin with the Gentle version. Stop if you see a firm ridge along your tummy (hard doming), or feel pain, leaking or pelvic heaviness. Not sure if you have diastasis recti? Ask your doctor or a pelvic floor physiotherapist to check.</p>
  </section>`;
}

// Pelvic floor follow-along workout (20 min).
async function pfSection(el) {
  let w;
  try { [w] = (await getFull('/workouts/pf')).data; } catch { el.innerHTML = ''; return; }
  if (!w) { el.innerHTML = ''; return; }
  el.innerHTML = `<section class="card pf-card">
    <div class="pf-layout">
      <div class="pf-info">
        <div class="dr-badge pf-badge">🌸 Pelvic floor</div>
        <h2 style="margin:6px 0 4px">${esc(w.title)}</h2>
        <p class="small muted" style="margin:0 0 10px">${esc(w.blurb)}</p>
        <div class="iv-facts"><span><strong>${w.minutes}</strong> min</span><span><strong>${w.moves.length}</strong> moves</span><span>${esc(w.format_label)}</span><span>No equipment · mat + cushion</span></div>
        <a class="btn btn-primary mt" href="/workouts/${w.id}">${icon('play')}Start pelvic floor workout</a>
      </div>
      <ol class="dr-moves pf-moves">${w.moves.map((m) => `<li>${esc(m.name)}</li>`).join('')}</ol>
    </div>
    <p class="tiny muted" style="margin:10px 0 0">Lift gently on the out-breath and always relax fully between lifts. If you are pregnant, recently gave birth, had pelvic surgery, or have pain, leaking or heaviness, check with a doctor or pelvic floor physiotherapist first. Pelvic floor exercises should never hurt.</p>
  </section>`;
}

async function detail(ctx) {
  const { root, params, me } = ctx;
  root.innerHTML = skeleton(2, 'grid-2');
  let w;
  try {
    w = params.id.startsWith('plan-') ? await get(`/workout-plans/${params.id.slice(5)}/guided`)
      : params.id.startsWith('iv-') ? await get(`/workouts/interval/${params.id}`)
        : params.id.startsWith('ch-') ? await get(`/workouts/challenge/${params.id}`)
          : params.id.startsWith('drw-') || params.id.startsWith('pfw-') ? await get(`/workouts/dr/${params.id}`) : await get(`/workouts/ready/${params.id}`);
  } catch (e) { root.innerHTML = errorBox(e, false); return; }
  const isPlan = Boolean(w.plan_id);
  root.innerHTML = `
    <a class="small" href="${isPlan ? '/workout' : '/workouts'}">← ${isPlan ? 'Workout planner' : w.challenge ? 'Workouts · 14-Day Challenge' : 'All workouts'}</a>
    ${w.challenge ? `<div class="ch-dayline mt-s"><span>Day ${w.challenge.day} of ${w.challenge.total}</span><span class="ch-dots">${Array.from({ length: w.challenge.total }, (_, k) => `<i class="${k + 1 < w.challenge.day ? 'past' : k + 1 === w.challenge.day ? 'cur' : ''}"></i>`).join('')}</span></div>` : ''}
    <div class="page-head mt-s"><div><h1>${esc(w.emoji)} ${esc(w.title)}</h1>
      <p>${w.duration_min} min · ${esc(label(w.level))} · ${w.exercises.length} exercises${w.rounds > 1 ? ` · main circuit × ${w.rounds} rounds` : ''}${w.interval ? ` · ⏱ ${esc(w.format_label || 'timed intervals')}` : ''}</p></div>
      ${me && !isPlan && !w.challenge ? `<button class="btn btn-secondary" id="save">${icon('calendar')}Save to my plans</button>` : ''}</div>
    ${w.notes?.length ? `<div class="banner info mb">${icon('info')}<div class="small">${w.notes.map(esc).join('<br>')}</div></div>` : ''}
    <div id="guided"></div>
    ${me ? '' : `<div class="banner info mt">${icon('info')}<div><a href="/register">Create a free account</a> to save completed workouts to your history and progress reports.</div></div>`}`;
  const stop = mountGuided($('#guided'), w, {
    weightKg: me?.current_weight_kg || me?.profile?.weight_kg,
    celebrateExtra: w.challenge ? `<p class="ch-celebrate">🌟 Day ${w.challenge.day} of ${w.challenge.total} complete!${w.challenge.day < w.challenge.total ? ` See you tomorrow for Day ${w.challenge.day + 1}.` : ' You finished the whole challenge! 🏆'}</p>` : '', firstName: (me?.profile?.name || '').split(' ')[0], loggedIn: Boolean(me),
    onFinish: async ({ seconds, done, stoppedEarly, calories }) => {
      const finished = done.filter((d) => d.completed).length;
      if (!me) return;
      try {
        await post('/workout-sessions/guided', { title: `${w.emoji} ${w.title}`, total_duration_min: Math.max(1, Math.round(seconds / 60)), exercises: done, plan_id: w.plan_id, stopped_early: stoppedEarly, calories_burned: calories, workout_id: w.id });
        if (stoppedEarly) toast(`Saved ${finished} completed exercise${finished === 1 ? '' : 's'} to your history`);
        ctx.updateBell?.();
      } catch (e) { toastError(e); }
    },
  });
  $('#save')?.addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    try { await post('/workout-plans/from-ready', { workout_id: w.id }); toast('Saved as your active plan ✓'); } catch (err) { toastError(err); }
  }));
  void demoThumb;
  return stop;
}
