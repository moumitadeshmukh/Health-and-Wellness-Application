import { get, post, patch, del } from '../api.js';
import {
  esc, icon, $, label, skeleton, errorBox, toast, toastError, withBusy, options, ENUM_LABELS, fmtDate, today, confirmDialog,
  modal,
} from '../ui.js';
import { mountDemo } from '../demo.js';
import { mountPlayer } from '../player.js';
import { mountIntervalBuilder } from '../intervals-ui.js';
import { estimateCalories, showCelebration } from '../guided.js';
const durTxt = (m) => (m < 1 ? `${Math.round(m * 60)} sec` : `${m} min`);

const EQUIP = { dumbbells: 'Dumbbells', step_or_stairs: 'Step / stairs', bench_or_sturdy_surface: 'Bench / sturdy surface', bench_or_sofa: 'Sofa / bench', bicycle: 'Bicycle', resistance_band: 'Resistance band', mat: 'Exercise mat' };
const dose = (x) => [x.sets ? `${x.sets}×` : '', x.reps ? `${x.reps} reps` : '', x.duration_min ? durTxt(x.duration_min) : '', x.rounds ? `· ${x.rounds} rounds` : ''].filter(Boolean).join(' ');

export async function render(ctx) {
  return ctx.opts.view === 'history' ? history(ctx) : planner(ctx);
}

async function planner(ctx) {
  const { root, me } = ctx;
  const p = me.profile;
  let timer = null;
  const CAT_OK = (c) => !['warmup', 'cooldown'].includes(c.id);
  let focus = ctx.query.get('category') || '';
  let minutes = 20;
  root.innerHTML = `<div class="page-head"><div><h1>Workout Planner</h1></div></div>${skeleton(2, 'grid-2')}`;

  const load = async () => {
    let plans; let sessions; let ai; let cats;
    try { [plans, sessions, ai, cats] = await Promise.all([get('/workout-plans'), get('/workout-sessions'), get('/ai/status'), get('/exercises/categories')]); }
    catch (e) { root.innerHTML = errorBox(e); root.querySelector('[data-retry]')?.addEventListener('click', load); return; }
    const plan = plans.find((x) => x.is_active) || plans[0];
    const session = plan && sessions.find((s) => s.plan_id === plan.id && s.date === today() && !s.completed_at);
    const doneToday = plan && sessions.find((s) => s.plan_id === plan.id && s.date === today() && s.completed_at);

    root.innerHTML = `
      <div class="page-head"><div><h1>Workout Planner</h1><p>Personalised routines with a warm-up, main set and cool-down.</p></div><div class="row"><a class="btn btn-secondary" href="/workouts">${icon('play')}Ready-made workouts</a><a class="btn btn-secondary" href="/workout/history">${icon('clock')}History</a></div></div>
      <div id="ivb" class="mb"></div>
      <div class="card mb">
        <div class="card-head" style="margin-bottom:6px"><h2 style="margin:0">Plans by category</h2><span class="small muted">One tap builds a plan focused on that area, using your level, time and equipment below</span></div>
        <div class="cat-scroll" id="quickcats">${cats.filter(CAT_OK).map((c) => `<button type="button" class="cat-card" data-qcat="${c.id}" aria-pressed="${focus === c.id}"><span class="emoji">${c.icon}</span><strong class="small">${esc(c.name)}</strong><span class="tiny muted">${c.count} exercises</span></button>`).join('')}</div>
      </div>
      <div class="grid grid-3">
        <div class="card">
          <h2>Generate a plan</h2>
          <form id="gen" class="stack mt">
            <div class="field"><label for="focus">Focus area</label><select class="input" id="focus"><option value="">Balanced mix for my goal</option>${cats.filter(CAT_OK).map((c) => `<option value="${c.id}" ${focus === c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select>
              <div class="field-hint" id="focus-hint">${focus ? 'All main exercises come from this category.' : 'Mixes categories that suit your goal.'}</div></div>
            <div class="field" id="goal-field" ${focus ? 'hidden' : ''}><label for="goal">Goal</label><select class="input" id="goal">${options(ENUM_LABELS.fitness_goal, p.fitness_goal)}</select></div>
            <div class="field"><label for="level">Level</label><select class="input" id="level">${options(ENUM_LABELS.exercise_intensity, p.exercise_intensity)}</select></div>
            <div class="field"><span class="label">Time available</span><div class="chips" id="dur">${[10, 15, 20, 30, 45].map((m) => `<button type="button" class="chip" aria-pressed="${m === minutes}" data-min="${m}">${m} min</button>`).join('')}</div></div>
            <fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label">Equipment you have</legend>${Object.entries(EQUIP).map(([k, v]) => `<label class="checkbox small"><input type="checkbox" value="${k}" name="eq">${v}</label>`).join('')}</fieldset>
            <label class="checkbox"><input type="checkbox" id="low">Low-impact only (no jumping)</label>
            ${ai.enabled ? `<label class="checkbox" id="ai-field" ${focus ? 'hidden' : ''}><input type="checkbox" id="useai" checked>Let AI pick the exercises</label>` : ''}
            <button class="btn btn-primary" id="genbtn">${icon('sparkles')}Generate plan</button>
          </form>
        </div>
        <div class="card span-2" id="plan-card">${plan ? planHtml(plan, session, doneToday) : '<div class="empty"><div class="big">🏃</div>Generate your first plan to get started.</div>'}</div>
      </div>
      <p class="disclaimer mt">Exercise can strengthen and tone muscles but cannot burn fat from one specific area. If you have a medical condition, injury or are pregnant, check with a healthcare professional before starting a new routine. Stop if you feel pain, dizziness or chest discomfort.</p>`;

    mountIntervalBuilder($('#ivb'), { level: p.exercise_intensity || 'beginner', loggedIn: true });
    root.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => {
      minutes = Number(b.dataset.min);
      root.querySelectorAll('[data-min]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    const setFocus = (v) => {
      focus = v;
      $('#focus').value = v;
      $('#goal-field').hidden = Boolean(v);
      if ($('#ai-field')) $('#ai-field').hidden = Boolean(v);
      $('#focus-hint').textContent = v ? 'All main exercises come from this category.' : 'Mixes categories that suit your goal.';
      root.querySelectorAll('[data-qcat]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.qcat === v)));
    };
    $('#focus').addEventListener('change', (e) => setFocus(e.target.value));
    const generate = async (btn) => withBusy(btn, async () => {
      try {
        const created = await post('/workout-plans/generate', {
          goal: $('#goal').value, level: $('#level').value, duration_min: minutes, category: focus || undefined,
          equipment: [...root.querySelectorAll('input[name=eq]:checked')].map((x) => x.value),
          low_impact: $('#low').checked, use_ai: !focus && Boolean($('#useai')?.checked),
        });
        toast(created.source === 'ai' ? 'AI plan ready ✨' : 'Plan ready ✓');
        await load();
        $('#plan-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) { toastError(err); }
    }, 'Generating…');
    $('#gen').addEventListener('submit', (e) => { e.preventDefault(); generate($('#genbtn')); });
    root.querySelectorAll('[data-qcat]').forEach((b) => b.addEventListener('click', () => { setFocus(b.dataset.qcat); generate(b); }));
    if (focus && !plans.some((x) => x.is_active && x.focus_category === focus) && ctx.query.get('category') && !load.autoDone) {
      load.autoDone = true;
      generate($('#genbtn'));
    }

    if (!plan) return;
    $('#start')?.addEventListener('click', async () => {
      try { await post('/workout-sessions', { plan_id: plan.id, date: today() }); load(); } catch (err) { toastError(err); }
    });
    $('#delplan')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this workout plan?'))) return;
      try { await del(`/workout-plans/${plan.id}`); toast('Plan deleted'); load(); } catch (err) { toastError(err); }
    });
    if (session) {
      const startedAt = Date.parse(session.started_at);
      const tick = () => { const s = Math.floor((Date.now() - startedAt) / 1000); const el = $('#timer'); if (el) el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
      tick(); timer = setInterval(tick, 1000);
      root.querySelectorAll('[data-ex]').forEach((cb) => cb.addEventListener('change', async () => {
        cb.closest('.ex-row').classList.toggle('done', cb.checked);
        try { await post(`/workout-sessions/${session.id}/complete-exercise`, { exercise_id: cb.dataset.ex, completed: cb.checked }); } catch (err) { toastError(err); }
      }));
      root.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', async () => {
        const row = plan.exercises.find((x) => x.exercise_id === b.dataset.play);
        let ex;
        try { ex = await get(`/exercises/${row.exercise_id}`); } catch (err) { toastError(err); return; }
        const merged = { ...ex, sets: row.sets, reps: row.reps, duration_min: row.duration_min, rest_seconds: row.rest_seconds };
        let cleanup = () => {};
        modal(`<div class="row between"><h2 style="margin:0">${esc(row.name)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
          <div id="m-demo" class="mt-s"></div><div id="m-player" class="mt-s"></div>
          <p class="tiny muted mt-s">${esc(ex.safety_notes)} Stop if you feel pain or dizziness.</p>`, {
          className: 'modal',
          onMount: (m, close) => {
            const demo = mountDemo(m.querySelector('#m-demo'), ex.id, { equipment: ex.equipment, name: ex.name });
            demo.pause();
            const stopP = mountPlayer(m.querySelector('#m-player'), merged, {
              demo,
              onComplete: async () => {
                const cb = root.querySelector(`[data-ex="${row.exercise_id}"]`);
                if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
                toast(`${row.name} done ✓`);
                setTimeout(close, 1200);
              },
            });
            cleanup = () => { demo(); stopP(); };
          },
          onClose: () => cleanup(),
        });
      }));
      $('#finish').addEventListener('click', async () => {
        try {
          const done = await patch(`/workout-sessions/${session.id}`, { complete: true });
          clearInterval(timer);
          const doneEx = plan.exercises.filter((x) => done.completions?.find((c) => c.exercise_id === x.exercise_id && c.completed));
          const mins = Math.min(done.total_duration_min, Math.round((plan.est_total_minutes || plan.duration_min) * 1.5));
          const wkg = me.current_weight_kg || me.profile?.weight_kg;
          showCelebration({ title: plan.name, minutes: mins, exercises: doneEx.length, rounds: plan.rounds || 1, calories: estimateCalories(doneEx, mins, wkg), weightKg: wkg, firstName: (me.profile?.name || '').split(' ')[0], loggedIn: true });
          load();
        } catch (err) { toastError(err); }
      });
      $('#cancel').addEventListener('click', async () => {
        if (!(await confirmDialog('Discard this workout session?', { okText: 'Discard' }))) return;
        await del(`/workout-sessions/${session.id}`); clearInterval(timer); load();
      });
    }
  };
  await load();
  return () => clearInterval(timer);
}

function planHtml(plan, session, doneToday) {
  const phase = (key, title0) => {
    const title = key === 'main' && plan.rounds > 1 ? `${title0} — repeat ${plan.rounds} rounds` : title0;
    const rows = plan.exercises.filter((x) => x.phase === key);
    if (!rows.length) return '';
    return `<div class="phase-title">${title}</div>${rows.map((x) => {
      const c = session?.completions.find((y) => y.exercise_id === x.exercise_id);
      return `<div class="ex-row ${c?.completed ? 'done' : ''}">
        ${session ? `<input type="checkbox" data-ex="${x.exercise_id}" ${c?.completed ? 'checked' : ''} aria-label="Mark ${esc(x.name)} complete" style="width:22px;height:22px;accent-color:var(--primary)">` : ''}
        <div class="grow"><a class="name" href="/exercises/${x.exercise_id}" style="color:inherit;font-weight:600">${esc(x.name)}</a>
        <div class="small muted">${esc(dose(x))}${x.rest_seconds ? ` · rest ${x.rest_seconds}s` : ''} · ~${x.est_minutes} min</div></div>
        ${session ? `<button type="button" class="btn btn-secondary btn-sm ex-play" data-play="${x.exercise_id}" aria-label="Start ${esc(x.name)}">${icon('play')}Start</button>` : `<span class="badge ${x.difficulty}">${x.difficulty}</span>`}</div>`;
    }).join('')}`;
  };
  const doneCount = session ? session.completions.filter((c) => c.completed).length : 0;
  return `
    <div class="card-head" style="align-items:flex-start"><div><h2>${esc(plan.name)}</h2>
      <div class="small muted">${plan.exercises.length} exercises · ~${plan.est_total_minutes} min · ${plan.source === 'ai' ? '<span class="badge violet">AI selected</span>' : plan.source === 'custom' ? '<span class="badge">Custom</span>' : '<span class="badge">Rule-based</span>'}${plan.low_impact ? ' <span class="tag">Low impact</span>' : ''}${plan.focus_category ? ' <span class="tag">Category plan</span>' : ''}</div></div>
      ${session ? '' : `<button class="icon-btn sm" id="delplan" aria-label="Delete plan">${icon('trash')}</button>`}</div>
    ${session ? `<div class="banner success">${icon('play')}<div class="grow"><div class="row between"><span>Session in progress · ${doneCount}/${session.completions.length} done</span><span class="timer" id="timer" aria-live="off">00:00</span></div></div></div>` : ''}
    ${doneToday && !session ? `<div class="banner success">${icon('check')}<div>Completed today in ${doneToday.total_duration_min} min. Rest and recover well!</div></div>` : ''}
    ${(plan.notes || []).map((n) => `<p class="small muted mt-s">${esc(n)}</p>`).join('')}
    ${phase('warmup', 'Warm-up')}${phase('main', 'Main workout')}${phase('cooldown', 'Cool-down')}
    <div class="row mt">${session ? '<button class="btn btn-primary" id="finish">Finish workout</button><button class="btn btn-ghost" id="cancel">Discard</button>' : `<a class="btn btn-primary" href="/workouts/plan-${plan.id}">${icon('play')}Play full workout (guided)</a><button class="btn btn-secondary" id="start">${doneToday ? 'Do it again step by step' : 'Step by step'}</button><a class="btn btn-ghost" href="/exercises">Add exercises</a>`}</div>`;
}

async function history(ctx) {
  const { root } = ctx;
  root.innerHTML = skeleton(1, 'grid-2');
  try {
    const sessions = (await get('/workout-sessions')).filter((s) => s.completed_at);
    const totalMin = sessions.reduce((s, x) => s + (x.total_duration_min || 0), 0);
    root.innerHTML = `
      <div class="page-head"><div><a class="small" href="/workout">← Workout planner</a><h1 class="mt-s">Workout history</h1><p>${sessions.length} completed session${sessions.length === 1 ? '' : 's'} · ${totalMin} minutes in total</p></div></div>
      <div class="card">${sessions.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Plan</th><th>Exercises done</th><th>Duration</th><th>Calories</th></tr></thead><tbody>
        ${sessions.map((s) => `<tr><td>${fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${esc(s.plan_name)}</td><td>${s.completions.filter((c) => c.completed).length}/${s.completions.length}</td><td><strong>${s.total_duration_min} min</strong></td><td>${s.calories_burned ? `🔥 ${s.calories_burned} kcal` : '—'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty"><div class="big">📅</div>No completed workouts yet.</div>'}</div>`;
  } catch (e) { root.innerHTML = errorBox(e, false); }
  void label;
}
