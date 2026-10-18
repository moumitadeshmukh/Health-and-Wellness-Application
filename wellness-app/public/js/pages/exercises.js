import { get, getFull, post } from '../api.js';
import { esc, icon, $, label, skeleton, errorBox, toast, toastError, modal, options, ENUM_LABELS } from '../ui.js';
import { demoThumb, mountDemo, videoEmbed, videoSearchUrl, videoWatchUrl } from '../demo.js';
import { mountPlayer } from '../player.js';
const durTxt = (m) => (m < 1 ? `${Math.round(m * 60)} sec` : `${m} min`);

const EQUIP = { none: 'No equipment', dumbbells: 'Dumbbells', step_or_stairs: 'Step / stairs', bench_or_sturdy_surface: 'Bench / sturdy surface', bench_or_sofa: 'Bench / sofa', bicycle: 'Bicycle', resistance_band: 'Resistance band', mat: 'Exercise mat' };
const CAT_EMOJI = {};

const doseText = (e) => [e.sets ? `${e.sets} set${e.sets > 1 ? 's' : ''}` : '', e.reps ? `${e.reps} reps` : '', e.duration_min ? durTxt(e.duration_min) : ''].filter(Boolean).join(' × ');

export async function render(ctx) {
  if (ctx.opts.view === 'detail') return detail(ctx);
  return list(ctx);
}

async function list(ctx) {
  const { root, query } = ctx;
  const f = { category: query.get('category') || '', difficulty: '', equipment: '', goal: '', max_duration: '', q: '' };
  root.innerHTML = `<div class="page-head"><div><h1>Exercise Library</h1></div></div>${skeleton(6)}`;
  let cats;
  try { cats = await get('/exercises/categories'); } catch (e) { root.innerHTML = errorBox(e, false); return; }
  cats.forEach((c) => { CAT_EMOJI[c.id] = c.icon; });
  root.innerHTML = `
    <div class="page-head"><div><h1>Exercise Library</h1><p>Step-by-step guidance with form tips, modifications and safety notes.</p></div><a class="btn btn-primary" href="/workouts">${icon('play')}Ready-made workouts (20 / 30 / 45 min)</a></div>
    <div class="cat-scroll" id="cats" role="group" aria-label="Exercise categories">
      <button class="cat-card" data-cat="" aria-pressed="${!f.category}"><span class="emoji">✨</span><strong class="small">All exercises</strong><span class="tiny muted">${cats.reduce((s, c) => s + c.count, 0)} exercises</span></button>
      ${cats.map((c) => `<button class="cat-card" data-cat="${c.id}" aria-pressed="${f.category === c.id}"><span class="emoji">${c.icon}</span><strong class="small">${esc(c.name)}</strong><span class="tiny muted">${c.count} exercise${c.count === 1 ? '' : 's'}</span></button>`).join('')}
    </div>
    <div class="card mt"><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="field"><label for="q">Search</label><input class="input" id="q" placeholder="Name or muscle"></div>
      <div class="field"><label for="difficulty">Difficulty</label><select class="input" id="difficulty"><option value="">Any</option>${options(ENUM_LABELS.exercise_intensity)}</select></div>
      <div class="field"><label for="max_duration">Duration</label><select class="input" id="max_duration"><option value="">Any</option><option value="3">Up to 3 min</option><option value="5">Up to 5 min</option><option value="10">Up to 10 min</option><option value="20">Up to 20 min</option></select></div>
      <div class="field"><label for="equipment">Equipment</label><select class="input" id="equipment"><option value="">Any</option>${options(EQUIP)}</select></div>
      <div class="field"><label for="goal">Fitness goal</label><select class="input" id="goal"><option value="">Any</option>${options(ENUM_LABELS.fitness_goal)}</select></div>
    </div></div>
    <div id="banners" class="mt"></div>
    <div id="results" class="mt"></div>`;

  const run = async () => {
    $('#results').innerHTML = skeleton(6);
    try {
      const res = await getFull('/exercises', f);
      $('#banners').innerHTML = `${res.meta.dr_safety ? `<div class="banner warn">${icon('alert')}<div><strong>Diastasis recti safety:</strong> ${esc(res.meta.dr_safety)}</div></div>` : ''}${res.meta.dr_program ? `<div class="banner info mt-s">${icon('info')}<div><strong>Phase 1</strong> = Beginner moves (breathing, deep-core activation, heel slides, 90° heel taps, bridges). <strong>Phase 2</strong> = Intermediate moves (heel slide & leg lift, dead bug, modified plank). ${esc(res.meta.dr_program)}</div></div>` : ''}${res.meta.kegel_safety ? `<div class="banner warn">${icon('alert')}<div><strong>Pelvic floor safety:</strong> ${esc(res.meta.kegel_safety)}</div></div>` : ''}${res.meta.disclaimer ? `<div class="banner info mt-s">${icon('info')}<div>${esc(res.meta.disclaimer)}</div></div>` : ''}`;
      const planBtn = f.category && !['warmup', 'cooldown'].includes(f.category)
        ? `<a class="btn btn-primary btn-sm" href="${ctx.me ? `/workout?category=${f.category}` : '/register'}">${icon('calendar')}${ctx.me ? 'Make a plan from this category' : 'Sign up to make a plan'}</a>` : '';
      $('#results').innerHTML = res.data.length ? `<div class="row between mb"><h2 style="margin:0">${f.category ? esc(cats.find((c) => c.id === f.category)?.name || '') : 'All exercises'}</h2><div class="row"><span class="small muted">${res.data.length} exercise${res.data.length === 1 ? '' : 's'}</span>${planBtn}</div></div><div class="grid grid-3">${res.data.map((e) => `
        <a class="card" href="/exercises/${e.id}">
          <div class="thumb ex" aria-hidden="true">${demoThumb(e.id, e.equipment)}</div>
          <div class="row between"><h3 style="margin:0">${esc(e.name)}</h3><span class="badge ${e.difficulty}">${e.difficulty}</span></div>
          <div class="small muted mt-s">${esc(doseText(e))} · ~${e.est_minutes} min</div>
          <div class="small mt-s">${icon('target', 'width="14" height="14" style="display:inline;vertical-align:-2px"')} ${esc(e.target_muscles.join(', '))}</div>
          <div class="chips mt-s">${e.impact === 'low' ? '<span class="tag">Low impact</span>' : '<span class="badge intermediate">Higher impact</span>'}${e.equipment.filter((q) => q !== 'none').map((q) => `<span class="badge">${esc(EQUIP[q] || label(q))}</span>`).join('')}</div>
        </a>`).join('')}</div>` : '<div class="empty"><div class="big">🔎</div>No exercises match these filters.</div>';
    } catch (e) { $('#results').innerHTML = errorBox(e, false); }
  };
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    f.category = b.dataset.cat;
    root.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    run();
  });
  ['difficulty', 'equipment', 'goal', 'max_duration'].forEach((k) => $(`#${k}`).addEventListener('change', (e) => { f[k] = e.target.value; run(); }));
  let t; $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value.trim(); run(); }, 250); });
  run();
}

async function detail(ctx) {
  const { root, params } = ctx;
  root.innerHTML = skeleton(2, 'grid-2');
  let e;
  try { e = await get(`/exercises/${params.id}`); } catch (err) { root.innerHTML = errorBox(err, false); return; }
  root.innerHTML = `
    <a class="small" href="/exercises">← Exercise library</a>
    <div class="grid grid-2 mt">
      <div>
        ${e.video_url ? `<div class="seg-tabs mb-s" role="tablist" aria-label="Demonstration">
            <button class="seg-tab" role="tab" data-view="video" aria-selected="true">🎬 Real video</button>
            <button class="seg-tab" role="tab" data-view="anim" aria-selected="false">✨ Animation</button></div>
          <div id="vid-pane"><div id="vid"></div>
            <div class="row between mt-s"><span class="tiny muted">Coach demonstration${e.video_by ? ` · <strong>${esc(e.video_by)}</strong>` : ''} · via YouTube</span>
              <a class="small" href="${esc(videoWatchUrl(e.video_url))}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></div>
            <p class="tiny muted">Needs an internet connection. Offline? Switch to the Animation tab.</p></div>` : ''}
        <div id="anim-pane" ${e.video_url ? 'hidden' : ''}><div id="demo"></div>
        <div class="row between mt-s"><span class="tiny muted">Animated guide — follow the written steps for exact form.</span>
          <a class="btn btn-secondary btn-sm" href="${videoSearchUrl(e.name)}" target="_blank" rel="noopener noreferrer">${icon('play')}More videos</a></div>
        <p class="tiny muted">Videos open on YouTube in a new tab. Check that any video you follow comes from a qualified trainer or physiotherapist.</p></div>
        <div id="player" class="mt"></div>
        <h1>${esc(e.name)}</h1>
        <div class="chips"><span class="badge ${e.difficulty}">${e.difficulty}</span><span class="badge">${esc(e.category_name)}</span>${e.impact === 'low' ? '<span class="tag">Low impact</span>' : '<span class="badge intermediate">Higher impact</span>'}</div>
        <div class="grid grid-3 mt">
          <div class="card" style="padding:12px"><div class="tiny muted">Dose</div><strong class="small">${esc(doseText(e)) || '—'}</strong></div>
          <div class="card" style="padding:12px"><div class="tiny muted">Rest</div><strong>${e.rest_seconds ? `${e.rest_seconds}s` : '—'}</strong></div>
          <div class="card" style="padding:12px"><div class="tiny muted">Time</div><strong>~${e.est_minutes} min</strong></div>
        </div>
        <p class="mt"><strong>Target muscles:</strong> ${e.target_muscles.map((m) => `<span class="tag">${esc(m)}</span>`).join(' ')}</p>
        <p><strong>Equipment:</strong> ${e.equipment.map((q) => esc(EQUIP[q] || label(q))).join(', ')}</p>
        <button class="btn btn-primary" id="add">${icon('plus')}${ctx.me ? 'Add to workout plan' : 'Sign up to add to a workout plan'}</button>
      </div>
      <div class="stack">
        ${e.dr_safety ? `<div class="banner warn">${icon('alert')}<div><strong>Diastasis recti safety:</strong> ${esc(e.dr_safety)}</div></div>` : ''}${e.dr_program ? `<div class="banner info mt-s">${icon('info')}<div>${esc(e.dr_program)}</div></div>` : ''}
        ${e.kegel_safety ? `<div class="banner warn">${icon('alert')}<div><strong>Pelvic floor safety:</strong> ${esc(e.kegel_safety)}</div></div>` : ''}
        <div class="card"><h2>How to do it</h2><ol class="steps-ol mt">${e.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
        <div class="card"><h3>Form & breathing</h3><p class="small">${esc(e.form_notes)}</p><p class="small"><strong>Breathing:</strong> ${esc(e.breathing_guidance)}</p>
          <h3 class="mt">Beginner modification</h3><p class="small">${esc(e.modifications)}</p></div>
        <div class="banner error"><span>${icon('alert')}</span><div><strong>Safety:</strong> ${esc(e.safety_notes)} Stop if you feel pain, dizziness or chest discomfort.</div></div>
        <div class="card"><h3>Common mistakes</h3><ul class="small" style="margin:0;padding-left:1.2rem">${e.common_mistakes.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
        ${e.disclaimer ? `<p class="disclaimer">${esc(e.disclaimer)}</p>` : ''}
      </div>
    </div>`;
  const demo = mountDemo($('#demo'), e.id, { equipment: e.equipment, name: e.name });
  demo.pause();
  if (e.video_url) {
    // Real video first; the iframe is only created while its tab is open (stops playback when switching away).
    const show = (view) => {
      root.querySelectorAll('.seg-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
      $('#vid-pane').hidden = view !== 'video'; $('#anim-pane').hidden = view !== 'anim';
      $('#vid').innerHTML = view === 'video' ? videoEmbed(e.video_url, esc(e.name)) : '';
      try { localStorage.setItem('demoView', view); } catch { /* ignore */ }
    };
    let pref = 'video'; try { pref = localStorage.getItem('demoView') === 'anim' || !navigator.onLine ? 'anim' : 'video'; } catch { /* ignore */ }
    show(pref);
    root.querySelectorAll('.seg-tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));
  }
  const stopPlayer = mountPlayer($('#player'), e, { demo, onComplete: () => toast(`${e.name} complete — well done! 🎉`) });
  const stopDemo = () => { demo(); stopPlayer(); };
  $('#add').addEventListener('click', async () => {
    if (!ctx.me) { ctx.navigate('/register'); return; }
    let plans = [];
    try { plans = await get('/workout-plans'); } catch { /* ignore */ }
    modal(`<h2>Add to workout plan</h2>
      ${plans.length ? `<ul class="list">${plans.slice(0, 6).map((p) => `<li><span class="grow"><strong class="small">${esc(p.name)}</strong>${p.is_active ? ' <span class="tag">active</span>' : ''}<div class="tiny muted">${p.exercises.length} exercises</div></span><button class="btn btn-secondary btn-sm" data-plan="${p.id}">Add</button></li>`).join('')}</ul>` : '<p class="muted small">You have no plans yet.</p>'}
      <form id="np" class="input-group mt"><label class="sr-only" for="npn">New plan name</label><input class="input" id="npn" placeholder="New plan name" value="My ${esc(e.category_name)} routine"><button class="btn btn-primary">Create</button></form>
      <div class="row mt" style="justify-content:flex-end"><button class="btn btn-ghost" data-close>Close</button></div>`, {
      onMount: (el, close) => {
        el.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', async () => {
          try { await post(`/workout-plans/${b.dataset.plan}/exercises`, { exercise_id: e.id }); close(); toast('Added to plan ✓'); } catch (err) { toastError(err); }
        }));
        el.querySelector('#np').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          try { await post('/workout-plans/custom', { name: el.querySelector('#npn').value || 'My routine', exercise_id: e.id }); close(); toast('New plan created ✓'); ctx.navigate('/workout'); } catch (err) { toastError(err); }
        });
      },
    });
  });
  return stopDemo;
}
