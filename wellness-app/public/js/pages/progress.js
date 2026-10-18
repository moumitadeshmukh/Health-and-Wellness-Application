import { get, getFull, post } from '../api.js';
import { esc, icon, $, lineChart, barChart, fmtDate, fmtNum, fmtMin, skeleton, errorBox, today, toastError } from '../ui.js';

const HABIT_LABEL = { steps: ['Steps', '👣'], water: ['Water', '💧'], meals: ['Meals', '🍽️'], sleep: ['Sleep', '🌙'], weight: ['Weight', '⚖️'], workout: ['Workouts', '💪'] };

export async function render(ctx) {
  const { root } = ctx;
  let days = 30;
  const load = async () => {
    root.innerHTML = `<div class="page-head"><div><h1>Progress Reports</h1></div></div>${skeleton(6, 'grid-2')}`;
    let s; let habits; let insights;
    try {
      [s, habits, insights] = await Promise.all([get('/progress/summary', { days, end: today() }), get('/progress/habits', { date: today() }), getFull('/progress/insights', { end: today() })]);
    } catch (e) { root.innerHTML = errorBox(e); root.querySelector('[data-retry]')?.addEventListener('click', load); return; }
    const lbl = (d) => fmtDate(d);
    const series = (k, f = (v) => v) => s.series.map((x) => ({ label: lbl(x.date), value: x[k] === null ? null : f(x[k]) }));
    const anyData = s.series.some((x) => x.steps || x.water_ml || x.sleep_minutes || x.meals || x.weight_kg || x.workouts);

    root.innerHTML = `
      <div class="page-head"><div><h1>Progress Reports</h1><p>${fmtDate(s.from, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fmtDate(s.to, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
        <div class="row"><div class="chips" role="group" aria-label="Date range">${[7, 30, 90].map((d) => `<button class="chip" aria-pressed="${d === days}" data-days="${d}">${d} days</button>`).join('')}</div>
        <button class="btn btn-secondary" id="export">${icon('download')}Export CSV</button></div></div>
      ${anyData ? '' : '<div class="banner info mb">' + icon('info') + '<div>Start logging in the <a href="/tracker">Daily Tracker</a> — your charts will fill in as you go.</div></div>'}

      <div class="grid grid-4 mb">
        <div class="card"><div class="small muted">Weight change (${days}d)</div><div class="stat">${s.weight_change_kg === null ? '—' : `${s.weight_change_kg > 0 ? '+' : ''}${s.weight_change_kg}<small> kg</small>`}</div><div class="tiny muted">${s.weight_change_kg === null ? 'Log weight twice to see change' : 'first vs latest entry'}</div></div>
        <div class="card"><div class="small muted">Best current streak</div><div class="stat">🔥 ${Math.max(0, ...Object.values(habits.streaks).map((x) => x.current))}</div><div class="tiny muted">days in a row</div></div>
        <div class="card"><div class="small muted">Avg habit completion</div><div class="stat">${s.averages.habit_pct ?? 0}%</div><div class="tiny muted">per day</div></div>
        <div class="card"><div class="small muted">Avg calories</div><div class="stat">${fmtNum(s.averages.calories_est)}</div><div class="tiny muted">kcal on logged days (estimate)</div></div>
      </div>
      <div class="grid grid-4">
        <div class="card"><div class="small muted">Avg steps</div><div class="stat">${fmtNum(s.averages.steps)}</div><div class="tiny muted">on ${s.consistency.step_days} logged days</div></div>
        <div class="card"><div class="small muted">Avg water</div><div class="stat">${s.averages.water_ml ? `${(s.averages.water_ml / 1000).toFixed(1)}<small> L</small>` : '—'}</div><div class="tiny muted">${s.consistency.water_days}/${days} days logged</div></div>
        <div class="card"><div class="small muted">Avg sleep</div><div class="stat">${fmtMin(s.averages.sleep_minutes)}</div><div class="tiny muted">${s.consistency.sleep_days} nights logged</div></div>
        <div class="card"><div class="small muted">Workouts</div><div class="stat">${s.workouts.sessions}</div><div class="tiny muted">${s.workouts.minutes} min${s.workouts.exercise_completion_pct !== null ? ` · ${s.workouts.exercise_completion_pct}% exercises done` : ''}</div></div>
      </div>

      <div class="card mt"><h2>Insights</h2><ul class="list">${insights.data.map((i) => `<li style="justify-content:flex-start"><span class="icon-badge ${i.tone === 'positive' ? 'ib-green' : 'ib-blue'}">${icon(i.tone === 'positive' ? 'check' : 'sparkles')}</span><span class="grow small">${esc(i.text)}</span></li>`).join('')}</ul>
        <p class="tiny muted">Practical, general suggestions based on your logs — not medical advice.</p></div>

      <div class="grid grid-2 mt">
        <div class="card"><div class="card-head"><h2>Weight trend</h2>${s.weight_change_kg !== null ? `<span class="badge">${s.weight_change_kg > 0 ? '+' : ''}${s.weight_change_kg} kg</span>` : ''}</div>${lineChart(series('weight_kg'), { color: '#F59E0B', fmt: (v) => v, unit: ' kg' })}</div>
        <div class="card"><h2>Habit completion (last 7 days)</h2>${barChart(s.series.slice(-7).map((x) => ({ label: fmtDate(x.date, { weekday: 'short' }), value: x.habit_pct })), { color: '#16A34A', unit: '%', fmt: (v) => v })}</div>
        <div class="card"><h2>Daily steps</h2>${barChart(series('steps'), { goal: ctx.me.profile.step_goal || 8000 })}</div>
        <div class="card"><h2>Sleep duration (hours)</h2>${lineChart(series('sleep_minutes', (v) => Math.round((v / 60) * 10) / 10), { color: '#8B5CF6', goal: 7, min: 0, fmt: (v) => v, unit: ' h' })}</div>
        <div class="card"><h2>Estimated calories</h2>${barChart(series('calories_est'), { color: '#16A34A', unit: ' kcal' })}<p class="tiny muted">Estimates from logged meals only.</p></div>
        <div class="card"><div class="card-head"><h2>Water consistency</h2><span class="small muted">${s.consistency.water_days}/${days} days</span></div>
          <div class="heat" role="img" aria-label="Water logging calendar">${s.series.map((x) => {
            const g = ctx.me.profile.water_goal_ml || 2500; const r = x.water_ml ? Math.min(1, x.water_ml / g) : 0;
            return `<span title="${esc(fmtDate(x.date))}: ${x.water_ml ? `${x.water_ml} ml` : 'not logged'}" style="background:${r ? `rgba(14,165,233,${0.2 + r * 0.8})` : 'var(--subtle)'}"></span>`;
          }).join('')}</div>
          <div class="chart-legend mt-s"><span><i style="background:var(--subtle)"></i>Not logged</span><span><i style="background:rgba(14,165,233,.4)"></i>Some</span><span><i style="background:#0EA5E9"></i>Goal met</span></div></div>
        <div class="card"><div class="card-head"><h2>Meal logging</h2><span class="small muted">${s.consistency.meal_days}/${days} days</span></div>${barChart(series('meals'), { color: '#22C55E', fmt: (v) => v })}</div>
        <div class="card"><h2>Workout minutes</h2>${barChart(series('workout_minutes'), { color: '#8B5CF6', unit: ' min', fmt: (v) => v })}</div>
        <div class="card"><h2>Frequently cooked recipes</h2>${s.top_recipes.length ? `<ul class="list">${s.top_recipes.map((r) => `<li><a href="/recipes/${r.id}">${esc(r.name)}</a><span class="badge">${r.times}×</span></li>`).join('')}</ul>` : '<div class="empty small">Log a recipe as a meal to see it here.</div>'}</div>
      </div>

      <h2 class="mt">Habit streaks</h2>
      <div class="grid grid-3">${Object.entries(habits.streaks).map(([k, v]) => `<div class="card"><div class="row between"><span class="card-title">${HABIT_LABEL[k][1]} ${HABIT_LABEL[k][0]}</span>${v.current >= 3 ? '<span class="badge beginner">🔥 on a roll</span>' : ''}</div>
        <div class="row mt-s" style="gap:24px"><div><div class="stat">${v.current}</div><div class="tiny muted">current streak</div></div><div><div class="stat">${v.longest}</div><div class="tiny muted">longest streak</div></div><div><div class="stat">${v.total_days}</div><div class="tiny muted">days logged</div></div></div></div>`).join('')}</div>
      <div class="card mt"><h2>Milestones 🏆</h2>${habits.milestones.length ? `<ul class="list">${habits.milestones.map((m) => `<li style="justify-content:flex-start"><span style="font-size:1.4rem">${m.icon || '🏅'}</span><span class="grow"><strong class="small">${esc(m.label)}</strong><div class="tiny muted">${m.date ? fmtDate(m.date, { day: 'numeric', month: 'short', year: 'numeric' }) : esc(m.status || '')}</div></span></li>`).join('')}</ul>` : '<div class="empty small">Keep logging — your first milestones will appear here.</div>'}</div>`;

    root.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { days = Number(b.dataset.days); load(); }));
    $('#export').addEventListener('click', () => exportData('csv'));
  };
  await load();
}

export async function exportData(format = 'json') {
  try {
    const data = await post('/users/me/export', { format });
    const isCsv = format === 'csv';
    const blob = isCsv ? new Blob(['\ufeff' + data.content], { type: 'text/csv;charset=utf-8' }) : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = isCsv ? data.filename : `wellness-export-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (e) { toastError(e); }
}
