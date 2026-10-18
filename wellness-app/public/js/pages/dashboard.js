import { get, post } from '../api.js';
import {
  esc, icon, $, ring, sparkline, fmtNum, fmtMin, fmtTime, pct, progressBar, skeleton, errorBox, today, elapsedSince,
  BMI_LABEL, BMI_COLOR, toast, toastError, label, barChart, fmtDate, modal,
} from '../ui.js';

export async function render(ctx) {
  const { root } = ctx;
  root.innerHTML = `<div class="page-head"><div><h1>Loading…</h1></div></div>${skeleton(6)}`;
  const load = async () => {
    let d;
    try { d = await get('/dashboard/summary', { date: today() }); } catch (e) {
      root.innerHTML = errorBox(e); root.querySelector('[data-retry]')?.addEventListener('click', load); return;
    }
    const t = d.today;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const first = (d.name || '').split(' ')[0];
    const stepPct = pct(t.steps.count, t.steps.goal);
    const waterPct = pct(t.water.total_ml, t.water.goal_ml);
    const elapsed = elapsedSince(t.date, t.last_meal_time);
    const w = d.weight;
    let weightProgress = '';
    if (w.target_kg && w.current_kg && w.start_kg && w.start_kg !== w.target_kg) {
      const done = Math.max(0, Math.min(100, Math.round(((w.start_kg - w.current_kg) / (w.start_kg - w.target_kg)) * 100)));
      weightProgress = `<div class="mt-s small muted">Goal ${w.target_kg} kg · ${done}% of the way</div>${progressBar(done, 'amber')}`;
    } else if (w.target_kg) weightProgress = `<div class="mt-s small muted">Target ${w.target_kg} kg</div>`;

    const habitRows = [
      ['steps_logged', 'Steps logged', '/tracker/steps'], ['water_logged', 'Water logged', '/tracker/water'], ['meal_logged', 'A meal logged', '/tracker/meals'],
      ['sleep_logged', 'Sleep logged', '/tracker/sleep'], ['weight_logged', 'Weight logged', '/bmi'],
    ].map(([k, l, href]) => `<li><span class="check-icon ${t.habits[k] ? 'done' : ''}">${icon('check')}</span><a href="${href}" class="grow" style="color:inherit;text-decoration:none">${l}</a></li>`).join('');

    const mealsHtml = d.meals_today.length
      ? `<ul class="list">${d.meals_today.map((m) => `<li><div class="grow"><strong class="small">${esc(label(m.meal_type))}</strong><div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.items.join(', '))}</div></div><span class="small">~${fmtNum(m.calories)} kcal</span></li>`).join('')}</ul>
         <div class="small muted mt-s">Total ≈ ${fmtNum(t.meals.nutrition.calories)} kcal · ${t.meals.nutrition.protein_g} g protein <span class="badge">estimate</span></div>`
      : '<div class="empty small">No meals logged yet today.</div>';

    const workout = d.workout
      ? `<div><strong>${esc(d.workout.name)}</strong><div class="small muted">${d.workout.exercises} exercises · ~${d.workout.duration_min} min</div>
         ${d.workout.session?.completed_at ? `<div class="banner success mt-s">${icon('check')}<div>Completed today — nice work!</div></div>` : `<a class="btn btn-primary btn-sm mt-s" href="/workouts/plan-${d.workout.plan_id}">${icon('play')}Start workout</a>`}</div>`
      : '<div class="empty small">No plan yet. <a href="/workouts">Pick a ready-made workout</a> or <a href="/workout">build your own</a>.</div>';

    const week = d.week;
    root.innerHTML = `
      <div class="page-head">
        <div><h1>${greet}${first ? `, ${esc(first)}` : ''} 👋</h1><p>${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      </div>
      <div class="card mb"><div class="card-head" style="margin-bottom:8px"><h3 style="margin:0">Quick actions</h3></div>
        <div class="chips">
          <button class="chip" id="qa-weight">${icon('scale', 'width="16" height="16"')}Log weight</button>
          <button class="chip" data-water="250">${icon('droplet', 'width="16" height="16"')}Add water</button>
          <a class="chip" href="/workouts" style="text-decoration:none">${icon('play', 'width="16" height="16"')}Start a workout</a>
          <a class="chip" href="/tracker/steps" style="text-decoration:none">${icon('footprints', 'width="16" height="16"')}Log steps</a>
          <a class="chip" href="/tracker/meals" style="text-decoration:none">${icon('utensils', 'width="16" height="16"')}Log meal</a>
          <a class="chip" href="/recipes" style="text-decoration:none">${icon('chef', 'width="16" height="16"')}Find recipe</a>
          <a class="chip" href="/recipes?meal=snack" style="text-decoration:none">🥗 Healthy snacks</a>
          <a class="chip" href="/coach" style="text-decoration:none">${icon('chat', 'width="16" height="16"')}Chat with Tiara</a>
        </div></div>

      <div class="grid grid-3">
        <a class="card" href="/bmi">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-amber">${icon('scale')}</span>Weight & BMI</span></div>
          <div class="row" style="align-items:baseline"><span class="stat">${w.current_kg ?? '—'}<small> kg</small></span>
          ${d.bmi ? `<span class="muted">BMI <strong style="color:var(--text)">${d.bmi.bmi}</strong></span> ${d.bmi.category ? `<span class="badge ${BMI_COLOR[d.bmi.category]}">${BMI_LABEL[d.bmi.category]}</span>` : ''}` : ''}</div>
          ${weightProgress}
        </a>
        <div class="card">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-green">${icon('footprints')}</span>Steps</span><a class="small" href="/tracker/steps">Log</a></div>
          <div class="row" style="gap:16px">${ring(stepPct, { size: 96, stroke: 10, labelHtml: `<strong>${stepPct}%</strong>` })}
          <div><div class="stat">${fmtNum(t.steps.count)}</div><div class="small muted">of ${fmtNum(t.steps.goal)} steps</div>
          <div class="row mt-s" style="gap:6px"><button class="btn btn-secondary btn-sm" data-steps="1000">+1,000</button><button class="btn btn-secondary btn-sm" data-steps="2000">+2,000</button></div></div></div>
        </div>
        <div class="card">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-blue">${icon('droplet')}</span>Water</span><a class="small" href="/tracker/water">Details</a></div>
          <div class="row" style="gap:16px">${ring(waterPct, { size: 96, stroke: 10, color: '#0EA5E9', labelHtml: `<strong>${waterPct}%</strong>` })}
          <div><div class="stat">${(t.water.total_ml / 1000).toFixed(2)}<small> L</small></div><div class="small muted">of ${(t.water.goal_ml / 1000).toFixed(1)} L</div>
          <div class="row mt-s" style="gap:6px"><button class="btn btn-secondary btn-sm" data-water="250">+250 ml</button><button class="btn btn-secondary btn-sm" data-water="500">+500 ml</button></div></div></div>
        </div>

        <a class="card" href="/tracker/sleep">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-violet">${icon('moon')}</span>Sleep</span></div>
          ${t.sleep ? `<div class="stat">${fmtMin(t.sleep.duration_minutes)}</div><div class="small muted">${fmtTime(t.sleep.bedtime)} → ${fmtTime(t.sleep.wake_time)} · woke at ${fmtTime(t.wake_time)}</div>` : '<div class="empty small">Log last night\'s sleep</div>'}
        </a>
        <a class="card" href="/tracker/last-meal">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-amber">${icon('clock')}</span>Last meal</span></div>
          ${t.last_meal_time ? `<div class="stat">${fmtTime(t.last_meal_time)}</div><div class="small muted">${elapsed !== null ? `${fmtMin(elapsed)} ago` : ''}</div>` : '<div class="empty small">Not recorded today</div>'}
        </a>
        <div class="card">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-green">${icon('utensils')}</span>Today's meals</span><a class="small" href="/tracker/meals">Log meal</a></div>
          ${mealsHtml}
        </div>

        <div class="card">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-violet">${icon('dumbbell')}</span>Today's workout</span></div>
          ${workout}
        </div>
        <div class="card span-2">
          <div class="card-head"><span class="card-title"><span class="icon-badge ib-green">${icon('chef')}</span>What can I cook?</span><a class="small" href="/recipes/saved">Saved recipes</a></div>
          <form id="quick-recipe" class="input-group"><label class="sr-only" for="qr">Ingredients you have</label><input class="input" id="qr" placeholder="e.g. onion, tomato, paneer"><button class="btn btn-primary">${icon('search')}Find recipes</button></form>
          <p class="small muted mt-s">Type the ingredients you have at home, separated by commas.</p>
        </div>

        <div class="card span-2">
          <div class="card-head"><h3>Steps this week</h3><a class="small" href="/tracker/steps">Details</a></div>
          ${barChart(week.map((x) => ({ label: fmtDate(x.date, { weekday: 'short' }), value: x.steps })), { goal: t.steps.goal, height: 170 })}
        </div>
        <div class="card">
          <div class="card-head"><h3>BMI check</h3><a class="small" href="/bmi">Calculator</a></div>
          ${d.bmi ? (d.bmi.category ? `<div class="banner ${d.bmi.category === 'healthy_weight' ? 'success' : d.bmi.category === 'obesity' ? 'error' : 'warn'}"><div>Your BMI <strong>${d.bmi.bmi}</strong> is ${({ underweight: '<strong>below</strong> the healthy range', healthy_weight: 'in the <strong>healthy range</strong> ✅', overweight: '<strong>above</strong> the healthy range', obesity: '<strong>well above</strong> the healthy range' })[d.bmi.category]}.</div></div><p class="small muted mt-s">Healthy weight for your height: ${d.bmi.healthy_range.min_kg}–${d.bmi.healthy_range.max_kg} kg</p>` : `<p class="small">${esc(d.bmi.message)}</p>`) : '<div class="empty small">Add your height and weight on the <a href="/bmi">BMI page</a> to check your BMI.</div>'}
          <p class="tiny muted">BMI is a screening tool and does not directly measure body fat or determine complete health status.</p>
        </div>
        <div class="card span-2">
          <div class="card-head"><h3>This week</h3><a class="small" href="/progress">Full report</a></div>
          <div class="table-wrap"><table class="table"><tbody>
            <tr><td>Weight</td><td>${sparkline(week.map((x) => x.weight_kg), '#F59E0B')}</td><td class="small muted">${((n) => `${n} entr${n === 1 ? 'y' : 'ies'}`)(week.filter((x) => x.weight_kg).length)}</td></tr>
            <tr><td>Steps</td><td>${sparkline(week.map((x) => x.steps || null))}</td><td class="small muted">avg ${fmtNum(avg(week.map((x) => x.steps)))}</td></tr>
            <tr><td>Water</td><td>${sparkline(week.map((x) => x.water_ml || null), '#0EA5E9')}</td><td class="small muted">avg ${fmtNum(avg(week.map((x) => x.water_ml)))} ml</td></tr>
            <tr><td>Sleep</td><td>${sparkline(week.map((x) => x.sleep_minutes || null), '#8B5CF6')}</td><td class="small muted">avg ${fmtMin(avg(week.map((x) => x.sleep_minutes)))}</td></tr>
          </tbody></table></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Daily habits</h3></div>
          <div class="row" style="gap:16px;align-items:flex-start">${ring(t.habit_completion_pct, { size: 88, stroke: 9, labelHtml: `<strong>${t.habit_completion_pct}%</strong>` })}<ul class="list check-list grow">${habitRows}</ul></div>
        </div>
      </div>
      ${d.ai.enabled ? '' : '<p class="disclaimer mt">AI coach is running in rule-based mode. Add an Anthropic API key to the <code>.env</code> file to enable Claude-powered answers.</p>'}`;

    $('#qa-weight').addEventListener('click', () => modal(`<h2>Log weight</h2><form id="lw" class="stack"><div class="field"><label for="lwv">Weight (kg)</label><input class="input" id="lwv" type="number" step="0.1" min="20" max="300" required value="${w.current_kg ?? ''}"></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>`, {
      onMount: (el, close) => el.querySelector('#lw').addEventListener('submit', async (e) => { e.preventDefault(); try { await post('/weight', { weight_kg: Number(el.querySelector('#lwv').value), date: today() }); close(); toast('Weight saved ✓'); load(); } catch (err) { toastError(err); } }),
    }));
    root.querySelectorAll('[data-water]').forEach((b) => b.addEventListener('click', async () => {
      try { await post('/tracker/water', { amount_ml: Number(b.dataset.water), date: today() }); toast(`Added ${b.dataset.water} ml of water`); load(); } catch (e) { toastError(e); }
    }));
    root.querySelectorAll('[data-steps]').forEach((b) => b.addEventListener('click', async () => {
      try { await post('/tracker/steps', { step_count: Number(b.dataset.steps), date: today(), mode: 'add' }); toast(`Added ${Number(b.dataset.steps).toLocaleString()} steps`); load(); } catch (e) { toastError(e); }
    }));
    $('#quick-recipe').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#qr').value.trim();
      ctx.navigate(`/recipes${v ? `?ingredients=${encodeURIComponent(v)}` : ''}`);
    });
  };
  await load();
}

function avg(arr) {
  const v = arr.filter((x) => x);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
