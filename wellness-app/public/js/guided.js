// Guided workout player: plays a whole workout (warm-up → main → cool-down) hands-free.
// Start / Pause / Resume / Stop, Previous / Skip, auto-advance with rests and "get ready" breaks.
import { esc, icon, modal } from './ui.js';
import { mountDemo, demoThumb, videoEmbed } from './demo.js';

// Real coaching videos ({ exercise_id: { url, by } }), fetched once and shared by every player.
let videoMap = null;
const loadVideos = () => (videoMap ||= fetch('/api/v1/exercises/videos').then((r) => (r.ok ? r.json() : { data: {} })).then((j) => j.data || {}).catch(() => ({})));
const prefGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const prefSet = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ignore */ } };
import { beep } from './player.js';
import { voice, beat, confetti, pickCheer } from './coachfx.js';
const durTxt = (m) => (m < 1 ? `${Math.round(m * 60)} sec` : `${m} min`);

const GET_READY = 10; // seconds between exercises
const fmt = (s) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const workSeconds = (x) => (x.work_seconds ? x.work_seconds : x.duration_min ? Math.round(x.duration_min * 60) : Math.max(20, (x.reps || 10) * 4));
const PHASE = { warmup: 'Warm-up', main: 'Main workout', cooldown: 'Cool-down' };

// Approximate MET values (Compendium of Physical Activities) used for the calorie estimate.
const MET = { warmup: 3.5, cooldown: 2.3, stretching: 2.3, mobility: 2.5, yoga: 2.8, recovery: 2, facial: 1.5, kegel_pelvic: 2, diastasis_recti: 2.5, posture: 3, core: 3.8, chest_toning: 3.8, hip_lower_body: 5, full_body: 6, stamina: 6, low_impact: 4.5 };
const REST_MET = 1.8;
export function metFor(x) {
  const base = MET[x.category] ?? (x.phase === 'warmup' ? 3.5 : x.phase === 'cooldown' ? 2.3 : 4);
  return x.impact === 'high' || /jump|burpee|high knees|mountain climber|skater|jack/i.test(x.name || '') ? Math.max(base, 8) : base;
}
const DEFAULT_KG = 60;

/** Expand a workout into a flat list of timed steps. */
export function buildTimeline(workout) {
  if (workout.interval) return buildIntervalTimeline(workout);
  const rounds = Math.max(1, workout.rounds || 1);
  const order = [];
  const by = (p) => workout.exercises.filter((x) => x.phase === p);
  by('warmup').forEach((x) => order.push({ ex: x, round: 1 }));
  for (let r = 1; r <= rounds; r++) by('main').forEach((x) => order.push({ ex: x, round: r }));
  by('cooldown').forEach((x) => order.push({ ex: x, round: 1 }));
  const steps = [];
  order.forEach((o, i) => {
    const sets = Math.max(1, o.ex.sets || 1);
    for (let s = 1; s <= sets; s++) {
      steps.push({ type: 'work', slot: i, set: s, sets, secs: workSeconds(o.ex) });
      if (s < sets && o.ex.rest_seconds) steps.push({ type: 'rest', slot: i, set: s, sets, secs: o.ex.rest_seconds });
    }
    if (i < order.length - 1) steps.push({ type: 'ready', slot: i + 1, secs: GET_READY });
  });
  return { order, steps, rounds, total: steps.reduce((t, s) => t + s.secs, 0) };
}

/** Interval format: exercise for N seconds → rest M seconds → next exercise, in rounds. */
function buildIntervalTimeline(workout) {
  const rounds = Math.max(1, workout.rounds || 1);
  const order = [];
  const by = (p) => workout.exercises.filter((x) => x.phase === p);
  by('warmup').forEach((x) => order.push({ ex: x, round: 1 }));
  for (let r = 1; r <= rounds; r++) by('main').forEach((x) => order.push({ ex: x, round: r }));
  by('cooldown').forEach((x) => order.push({ ex: x, round: 1 }));
  const steps = [];
  order.forEach((o, i) => {
    steps.push({ type: 'work', slot: i, set: 1, sets: 1, secs: workSeconds(o.ex) });
    const next = order[i + 1];
    if (!next) return;
    if (o.ex.phase !== next.ex.phase) steps.push({ type: 'ready', slot: i + 1, secs: 15, kind: next.ex.phase === 'main' ? 'start-main' : 'start-cool' });
    else if (o.ex.phase === 'main' && next.round !== o.round) steps.push({ type: 'ready', slot: i + 1, secs: workout.round_rest || 60, kind: 'round', round: o.round });
    else steps.push({ type: 'ready', slot: i + 1, secs: o.ex.rest_seconds || 15, kind: o.ex.phase === 'main' ? 'rest' : 'switch' });
  });
  return { order, steps, rounds, total: steps.reduce((t, s) => t + s.secs, 0) };
}

/**
 * Mount the player.
 * opts.onFinish({ seconds, done: [{exercise_id,name,phase,completed}], stoppedEarly }) — called on finish or on Stop after some exercise.
 * Returns a cleanup function.
 */
export function mountGuided(el, workout, opts = {}) {
  const { order, steps, rounds, total } = buildTimeline(workout);
  const iv = Boolean(workout.interval);
  let metSecs = 0; // Σ MET × seconds actually exercised (for the calorie estimate)
  let i = 0; let left = steps[0].secs; let state = 'idle'; // idle | running | paused | done
  let timer = null; let elapsed = 0; let demo = null; let demoSlot = -1; let wakeLock = null; let soundOn = true;
  const completed = new Set();
  let realOn = prefGet('realVideos', navigator.onLine !== false); let videos = {};

  el.innerHTML = `<div class="guided card">
    <div class="guided-grid">
      <div>
        <div class="tiny muted" id="g-phase"></div>
        <h2 id="g-name" style="margin:2px 0 6px"></h2>
        <div class="g-stage"><div id="g-demo"></div>
          <div class="g-nextup" id="g-nextup" hidden><div class="g-nextup-label">NEXT UP</div><div class="g-nextup-name" id="g-nextup-name"></div><div class="g-nextup-time" id="g-nextup-time"></div></div>
          <div class="g-cheer" id="g-cheer" aria-hidden="true"></div>
          <button type="button" class="icon-btn g-fs" id="g-fs" aria-label="Full screen" title="Full screen focus mode">⛶</button></div>
        <div class="tiny muted mt-s" id="g-credit" hidden></div>
        <details class="mt-s"><summary class="small" style="cursor:pointer">How to do it</summary><ol class="small" id="g-steps" style="padding-left:1.2rem;margin:6px 0 0"></ol></details>
      </div>
      <div class="guided-side">
        <div class="guided-status" id="g-status">Ready to start</div>
        <div class="g-ring-wrap"><svg class="g-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="g-ring-bg"/><circle cx="60" cy="60" r="52" class="g-ring-fg" id="g-ring" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"/></svg>
          <div class="player-time" id="g-time">${fmt(steps[0].secs)}</div></div>
        <div class="small muted" id="g-sub"></div>
        <div class="progress mt-s" hidden><span id="g-step-bar" style="width:0%"></span></div>
        <div class="guided-controls">
          <button class="icon-btn" id="g-prev" aria-label="Previous exercise" title="Previous exercise">⏮</button>
          <button class="btn btn-primary guided-main" id="g-play">${icon('play')}Start workout</button>
          <button class="icon-btn" id="g-next" aria-label="Skip" title="Skip">⏭</button>
        </div>
        <button class="btn btn-secondary btn-sm" id="g-stop" disabled>⏹ Stop workout</button>
        <div class="mt">
          <div class="row between small"><span>Workout progress</span><span id="g-left">${fmt(total)} left</span></div>
          <div class="g-segs" id="g-segs" aria-hidden="true">${steps.map((st, k) => `<span class="${st.type === 'work' ? 'w' : 'r'}" style="flex:${st.secs}" data-k="${k}"></span>`).join('')}</div>
          <div class="progress blue" hidden><span id="g-total-bar" style="width:0%"></span></div>
          <div class="small mt-s" id="g-upnext"></div>
        </div>
        <div class="g-toggles">
          <label class="g-toggle"><input type="checkbox" id="g-sound" checked><span>🔔 Beeps</span></label>
          <label class="g-toggle"><input type="checkbox" id="g-voice" ${voice.on ? 'checked' : ''}><span>🗣 Voice coach</span></label>
          <label class="g-toggle"><input type="checkbox" id="g-beat" ${beat.on ? 'checked' : ''}><span>🎵 Workout beat</span></label>
          <label class="g-toggle"><input type="checkbox" id="g-real" ${realOn ? 'checked' : ''}><span>🎬 Real videos</span></label>
        </div>
      </div>
    </div>
    <div class="phase-title">Exercises in this workout${rounds > 1 ? ` (main circuit × ${rounds} rounds)` : ''}</div>
    <ol class="guided-list" id="g-list">${order.map((o, k) => `<li data-slot="${k}"><button type="button" data-jump="${k}" class="guided-item"><span class="gl-num">${k + 1}</span><span class="gl-thumb">${demoThumb(o.ex.exercise_id, o.ex.equipment)}</span><span class="grow"><strong class="small">${esc(o.ex.name)}</strong><span class="tiny muted">${PHASE[o.ex.phase]}${rounds > 1 && o.ex.phase === 'main' ? ` · round ${o.round}` : ''} · ${esc(dose(o.ex))}</span></span><span class="gl-state"></span></button></li>`).join('')}</ol>
    <div class="sr-only" aria-live="assertive" id="g-announce"></div>
  </div>`;
  const $ = (s) => el.querySelector(s);
  const cue = (f, ms) => { if (soundOn) beep(f, ms); };
  const say = (t) => { $('#g-announce').textContent = t; };
  $('#g-sound').addEventListener('change', (e) => { soundOn = e.target.checked; });
  $('#g-voice').addEventListener('change', (e) => { voice.on = e.target.checked; if (e.target.checked) voice.say('Voice coach on'); });
  $('#g-beat').addEventListener('change', (e) => { beat.on = e.target.checked; if (e.target.checked && state === 'running') beat.start(); });
  $('#g-real').addEventListener('change', (e) => { realOn = e.target.checked; prefSet('realVideos', realOn); const s = demoSlot; demoSlot = -1; showExercise(s); });
  loadVideos().then((m) => { videos = m; if (realOn && demoSlot >= 0) { const s = demoSlot; demoSlot = -1; showExercise(s); } });
  const card = el.querySelector('.guided');
  $('#g-fs').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (card.requestFullscreen) await card.requestFullscreen();
      else card.classList.toggle('pseudo-fs');
    } catch { card.classList.toggle('pseudo-fs'); }
  });
  let cheerTimer = null;
  const cheer = (text) => {
    const c = $('#g-cheer'); c.textContent = text; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    clearTimeout(cheerTimer); cheerTimer = setTimeout(() => c.classList.remove('show'), 1800);
  };
  const segs = [...el.querySelectorAll('#g-segs span')];

  const elapsedBefore = (idx) => steps.slice(0, idx).reduce((t, s) => t + s.secs, 0);
  const slotOf = (idx) => steps[idx].slot;

  function showExercise(slot) {
    if (slot === demoSlot) return;
    demoSlot = slot;
    const x = order[slot].ex;
    $('#g-name').textContent = x.name;
    $('#g-steps').innerHTML = (x.instructions || []).map((t) => `<li>${esc(t)}</li>`).join('') || '<li>Follow the animation at a comfortable pace.</li>';
    if (demo) demo();
    demo = null;
    const v = realOn ? videos[x.exercise_id] : null;
    const credit = $('#g-credit');
    if (v) {
      // A real coach demonstrating the move: muted and looping so the timer, beeps and voice coach stay in charge.
      $('#g-demo').innerHTML = `<div class="g-video">${videoEmbed(v.url, esc(x.name), { silent: true })}</div>`;
      credit.hidden = false; credit.innerHTML = `🎬 Coach demo${v.by ? ` · ${esc(v.by)}` : ''} · via YouTube (muted). Turn off “Real videos” to see the animation.`;
    } else {
      credit.hidden = true;
      demo = mountDemo($('#g-demo'), x.exercise_id, { equipment: x.equipment, name: x.name });
      demo.pause();
    }
  }

  function render() {
    const st = steps[i]; const o = order[st.slot]; const x = o.ex;
    showExercise(st.slot);
    const same = order.filter((q) => q.ex.phase === x.phase && q.round === o.round);
    const pos = `${x.phase === 'main' ? 'Exercise' : x.phase === 'warmup' ? 'Move' : 'Stretch'} ${same.indexOf(o) + 1} of ${same.length}`;
    $('#g-phase').textContent = `${PHASE[x.phase]}${rounds > 1 && x.phase === 'main' ? ` · Round ${o.round} of ${rounds}` : ''} · ${pos}`;
    const label = state === 'done' ? 'Workout complete 🎉' : state === 'idle' ? 'Ready to start'
      : st.type === 'ready' && st.kind === 'rest' ? `Rest · next: ${x.name}`
      : st.type === 'ready' && st.kind === 'round' ? `Round ${st.round} done! 🎉 Rest — round ${st.round + 1} next`
      : st.type === 'ready' && st.kind === 'start-main' ? `Warm-up done! Main workout next: ${x.name}`
      : st.type === 'ready' && st.kind === 'start-cool' ? 'Great work! Cool-down next'
      : st.type === 'ready' ? `Get ready: ${x.name}`
      : iv ? `${x.name} · ${st.secs} sec` : st.type === 'rest' ? `Rest — set ${st.set + 1} next` : (x.duration_min ? `Set ${st.set} of ${st.sets} · Hold` : `Set ${st.set} of ${st.sets} · ${x.reps || 10} reps`);
    $('#g-status').textContent = state === 'paused' ? `Paused · ${label}` : label;
    $('#g-status').className = `guided-status ${state === 'paused' ? 'paused' : st.type === 'rest' || st.type === 'ready' ? 'rest' : ''} ${state === 'done' ? 'done' : ''}`;
    $('#g-time').textContent = fmt(state === 'done' ? 0 : left);
    const frac = state === 'done' ? 0 : left / st.secs;
    $('#g-ring').style.strokeDashoffset = String(100 - frac * 100);
    card.dataset.phase = state === 'done' ? 'done' : st.type === 'work' ? 'work' : 'rest';
    const showNext = state !== 'idle' && state !== 'done' && st.type !== 'work';
    $('#g-nextup').hidden = !showNext;
    if (showNext) { $('#g-nextup-name').textContent = x.name; $('#g-nextup-time').textContent = `${iv || x.work_seconds ? `${workSeconds(x)} seconds` : dose(x)} · starts in ${left}`; }
    segs.forEach((sg, k) => { sg.classList.toggle('done', state === 'done' || k < i); sg.classList.toggle('now', k === i && state !== 'idle' && state !== 'done'); });
    $('#g-sub').textContent = iv && st.type === 'work' && state !== 'done' ? (x.reps && x.phase === 'main' ? 'Keep going — as many good-form reps as you can' : 'Move with control and keep breathing')
      : iv && st.type === 'ready' ? 'Breathe, sip water, get into position'
      : st.type === 'work' && !x.duration_min && state !== 'done' ? 'Press ⏭ when you finish your reps' : st.type === 'ready' ? 'Next exercise starting soon' : '';
    $('#g-step-bar').style.width = `${state === 'done' ? 100 : Math.round(((st.secs - left) / st.secs) * 100)}%`;
    const doneSecs = state === 'done' ? total : elapsedBefore(i) + (st.secs - left);
    $('#g-total-bar').style.width = `${Math.round((doneSecs / total) * 100)}%`;
    $('#g-left').textContent = `${fmt(total - doneSecs)} left`;
    const nextSlot = st.slot + 1 < order.length ? order[st.slot + 1].ex.name : null;
    $('#g-upnext').innerHTML = state === 'done' ? '' : nextSlot ? `${st.type === 'work' ? 'Up next' : 'Then'}: <strong>${esc(nextSlot)}</strong>` : 'Last exercise — almost there!';
    $('#g-play').innerHTML = state === 'running' ? '⏸ Pause' : state === 'paused' ? `${icon('play')}Resume` : state === 'done' ? `${icon('refresh')}Start again` : `${icon('play')}Start workout`;
    $('#g-stop').disabled = state === 'idle' || state === 'done';
    $('#g-prev').disabled = state === 'idle';
    $('#g-next').disabled = state === 'idle' || state === 'done';
    el.querySelectorAll('[data-slot]').forEach((li) => {
      const k = Number(li.dataset.slot);
      li.className = completed.has(k) ? 'done' : k === st.slot && state !== 'idle' && state !== 'done' ? 'current' : '';
      li.querySelector('.gl-state').textContent = completed.has(k) ? '✓' : k === st.slot && state === 'running' ? '▶' : '';
    });
    if (state === 'running' && st.type === 'work') demo?.play(); else demo?.pause();
  }

  const markSlotDoneIfLeaving = (fromIdx, toIdx) => {
    const from = steps[fromIdx];
    if (toIdx >= steps.length || steps[toIdx].slot !== from.slot) {
      // finished all work steps of this slot?
      const lastWork = steps.map((s, k) => (s.slot === from.slot && s.type === 'work' ? k : -1)).filter((k) => k >= 0).pop();
      if (fromIdx >= lastWork) completed.add(from.slot);
    }
  };

  function goTo(idx, { auto = false } = {}) {
    if (idx >= steps.length) return finish();
    markSlotDoneIfLeaving(i, idx);
    i = Math.max(0, idx); left = steps[i].secs;
    const st = steps[i];
    if (auto) {
      const nm = order[st.slot].ex.name;
      if (st.type === 'work') { cue(880, 220); say(`${nm}, set ${st.set}, go`); voice.say(`Go! ${nm}`); beat.level(1); }
      else if (st.type === 'rest') { cue(520, 250); say('Rest'); voice.say('Rest. Shake it out.'); beat.level(0.4); }
      else {
        cue(660, 200); say(`Get ready for ${nm}`); beat.level(0.4);
        voice.say(st.kind === 'round' ? `Round ${st.round} done! Great job. Next up, ${nm}` : st.kind === 'start-cool' ? 'Amazing work! Time to cool down.' : st.kind === 'start-main' ? `Warm-up done! Let's get into it. First up, ${nm}` : `Rest. Next up, ${nm}`);
      }
    }
    render();
  }

  async function finish() {
    clearInterval(timer); timer = null;
    completed.add(steps[steps.length - 1].slot);
    state = 'done'; i = steps.length - 1; left = 0;
    cue(1320, 450); say('Workout complete'); beat.stop(); voice.say('Workout complete! You did amazing!');
    render(); releaseWake();
    const result = { seconds: elapsed, done: doneList(), stoppedEarly: false, calories: kcal() };
    celebrate(result);
    opts.onFinish?.(result);
  }
  const weightKg = Number(opts.weightKg) || null;
  const kcal = () => Math.round((metSecs / 3600) * (weightKg || DEFAULT_KG));
  const celebrate = ({ seconds, done, stoppedEarly, calories }) => showCelebration({
    title: workout.title, minutes: Math.max(1, Math.round(seconds / 60)), exercises: new Set(done.filter((d) => d.completed).map((d) => d.exercise_id)).size,
    rounds, calories, weightKg, firstName: opts.firstName, loggedIn: opts.loggedIn, stoppedEarly, extraHtml: stoppedEarly ? '' : opts.celebrateExtra,
  });
  const doneList = () => order.map((o, k) => ({ exercise_id: o.ex.exercise_id, name: o.ex.name, phase: o.ex.phase, completed: completed.has(k) }));

  function tick() {
    left -= 1; elapsed += 1;
    metSecs += steps[i].type === 'work' ? metFor(order[steps[i].slot].ex) : REST_MET;
    if (left > 0 && left <= 3 && steps[i].type !== 'work') { cue(660, 80); voice.say(String(left)); }
    if (steps[i].type === 'work' && steps[i].secs >= 30) {
      if (left === Math.floor(steps[i].secs / 2)) { cheer('Halfway! 💪'); voice.say('Halfway there!', { interrupt: false }); }
      else if (left === 10) { cheer('Last 10 seconds! 🔥'); voice.say('Last ten seconds, keep pushing!', { interrupt: false }); }
      else if (left === steps[i].secs - 8 && order[steps[i].slot].ex.phase === 'main') cheer(pickCheer());
    }
    if (left > 0 && left <= 3 && steps[i].type === 'work' && workout.exercises && steps[i].secs > 10) cue(740, 70);
    if (left <= 0) goTo(i + 1, { auto: true }); else render();
  }
  const run = () => { clearInterval(timer); timer = setInterval(tick, 1000); };

  async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not supported */ } }
  function releaseWake() { try { wakeLock?.release(); } catch { /* ignore */ } wakeLock = null; }

  $('#g-play').addEventListener('click', () => {
    if (state === 'running') { clearInterval(timer); timer = null; state = 'paused'; say('Paused'); beat.stop(); voice.say('Paused'); render(); return; }
    if (state === 'done') { completed.clear(); elapsed = 0; metSecs = 0; i = 0; left = steps[0].secs; }
    const fresh = state !== 'paused';
    state = 'running'; run(); keepAwake();
    beat.start(); beat.level(steps[i].type === 'work' ? 1 : 0.4);
    if (fresh && innerWidth < 860) el.querySelector('.guided-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (fresh) { cue(880, 220); say(`Starting with ${order[steps[i].slot].ex.name}`); voice.say(`Let's go! First up, ${order[steps[i].slot].ex.name}`); } else voice.say("Let's go!");
    render();
  });
  $('#g-stop').addEventListener('click', () => {
    clearInterval(timer); timer = null;
    const hadProgress = completed.size > 0 || elapsed > 60;
    const result = { seconds: elapsed, done: doneList(), stoppedEarly: true, calories: kcal() };
    state = 'idle'; i = 0; left = steps[0].secs; demoSlot = -1; completed.clear(); elapsed = 0; metSecs = 0;
    if (hadProgress) celebrate(result);
    say('Workout stopped'); beat.stop(); voice.stop(); render(); releaseWake();
    if (hadProgress) opts.onFinish?.(result);
  });
  $('#g-next').addEventListener('click', () => {
    // Skip: during a "ready" or "rest" jumps to the next step; during work, moves to the next set/exercise.
    goTo(i + 1, { auto: state === 'running' });
  });
  $('#g-prev').addEventListener('click', () => {
    const cur = steps[i].slot;
    const firstOf = (slot) => steps.findIndex((s) => s.slot === slot && s.type !== 'ready');
    const target = i > firstOf(cur) && steps[i].secs - left > 3 ? firstOf(cur) : firstOf(Math.max(0, cur - 1));
    completed.delete(steps[target].slot);
    i = target; left = steps[i].secs; render();
  });
  el.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
    if (state === 'idle') { state = 'paused'; }
    const k = Number(b.dataset.jump);
    i = steps.findIndex((s) => s.slot === k && s.type !== 'ready'); left = steps[i].secs; render();
    el.querySelector('.guided-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  render();
  return () => { clearInterval(timer); demo?.(); releaseWake(); beat.stop(); voice.stop(); clearTimeout(cheerTimer); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
}

function dose(x) {
  if (x.work_seconds) return `${x.work_seconds} s${x.phase === 'main' ? ` · ${x.rest_seconds} s rest` : ''}`;
  return [x.sets ? `${x.sets}×` : '', x.reps ? `${x.reps} reps` : '', x.duration_min ? durTxt(x.duration_min) : ''].filter(Boolean).join(' ');
}

/** Estimated calories for a finished checklist-style session (planner). */
export function estimateCalories(exercises, minutes, weightKg) {
  const list = exercises.length ? exercises : [{ phase: 'main' }];
  const avg = list.reduce((t, x) => t + metFor(x), 0) / list.length;
  return Math.round(avg * (minutes / 60) * (Number(weightKg) || DEFAULT_KG));
}

/** The "Well done!" pop-up with calories burned. */
export function showCelebration({ title, minutes, exercises, rounds = 1, calories, weightKg, firstName, loggedIn, stoppedEarly = false, extraHtml = '' }) {
  const idlis = Math.round(calories / 40);
  if (!stoppedEarly) confetti();
  modal(`<div class="celebrate">
      <div class="celebrate-burst" aria-hidden="true">${stoppedEarly ? '💪' : '🎉'}</div>
      <h2>${stoppedEarly ? 'Good effort' : 'Well done'}${firstName ? `, ${esc(firstName)}` : ''}!</h2>
      <p class="muted">${stoppedEarly ? 'Every minute counts — here is what you did.' : `You completed <strong>${esc(title)}</strong>.`}</p>
      <div class="celebrate-kcal"><span class="num">${calories}</span><span class="unit">kcal</span><div class="small muted">estimated calories burned 🔥</div></div>
      <div class="celebrate-stats"><div><strong>${minutes}</strong><span>minutes</span></div><div><strong>${exercises}</strong><span>exercises</span></div>${rounds > 1 ? `<div><strong>${rounds}</strong><span>rounds</span></div>` : ''}</div>
      ${extraHtml || ''}
      ${idlis >= 1 ? `<p class="small">That's about the energy in <strong>${idlis} idli${idlis === 1 ? '' : 's'}</strong> 🍥</p>` : ''}
      <p class="tiny muted">Estimate based on ${weightKg ? `your weight (${weightKg} kg)` : `a ${DEFAULT_KG} kg body weight — log your weight on the BMI page for a closer estimate`}, the type of exercise and time spent. Actual calories vary by person and effort.</p>
      <div class="row" style="justify-content:center;gap:8px">${loggedIn ? '<a class="btn btn-secondary" href="/progress" data-close>View progress</a>' : ''}<button class="btn btn-primary" data-close>Done</button></div>
    </div>`);
}
