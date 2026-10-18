import { get, getFull, post, put, patch, del } from '../api.js';
import {
  esc, icon, $, today, shiftDate, fmtNum, fmtMin, fmtTime, fmtDate, nowTime, pct, ring, barChart, progressBar,
  skeleton, errorBox, toast, toastError, withBusy, confirmDialog, modal, options, ENUM_LABELS, label, elapsedSince,
} from '../ui.js';

const TABS = [['steps', 'Steps'], ['water', 'Water'], ['meals', 'Meals'], ['sleep', 'Sleep'], ['last-meal', 'Last Meal'], ['summary', 'Summary']];

export async function render(ctx) {
  const { root, params, query } = ctx;
  const tab = TABS.some(([k]) => k === params.tab) ? params.tab : 'summary';
  let date = /^\d{4}-\d{2}-\d{2}$/.test(query.get('date') || '') ? query.get('date') : today();

  const frame = () => {
    root.innerHTML = `
      <div class="page-head"><div><h1>Daily Tracker</h1><p>Log your habits — every entry helps you see your progress.</p></div>
        <div class="row" style="gap:4px"><button class="icon-btn" id="prev" aria-label="Previous day">${icon('chevronLeft')}</button>
          <label class="sr-only" for="date">Date</label><input type="date" class="input" id="date" value="${date}" max="${today()}" style="width:auto">
          <button class="icon-btn" id="next" aria-label="Next day" ${date >= today() ? 'disabled' : ''}>${icon('chevronRight')}</button></div></div>
      <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<a class="tab" role="tab" href="/tracker/${k}${date !== today() ? `?date=${date}` : ''}" aria-selected="${k === tab}">${l}</a>`).join('')}</nav>
      <div id="panel">${skeleton(2, 'grid-2')}</div>`;
    const go = (d) => { date = d > today() ? today() : d; ctx.navigate(`/tracker/${tab}${date !== today() ? `?date=${date}` : ''}`, { replace: true }); };
    $('#prev').addEventListener('click', () => go(shiftDate(date, -1)));
    $('#next').addEventListener('click', () => go(shiftDate(date, 1)));
    $('#date').addEventListener('change', (e) => e.target.value && go(e.target.value));
  };
  frame();
  const panel = $('#panel');
  const reload = () => PANELS[tab](panel, date, reload, ctx).catch((e) => { panel.innerHTML = errorBox(e); panel.querySelector('[data-retry]')?.addEventListener('click', reload); });
  await reload();
}

const weekLabels = (end, n = 7) => Array.from({ length: n }, (_, i) => shiftDate(end, i - n + 1));

const PANELS = {
  // ---------------- STEPS ----------------
  async steps(panel, date, reload) {
    const res = await getFull('/tracker/steps', { from: shiftDate(date, -29), to: date });
    const goal = res.meta.goal;
    const byDate = Object.fromEntries(res.data.map((r) => [r.recorded_date, r]));
    const rec = byDate[date];
    const count = rec?.step_count || 0;
    const week = weekLabels(date).map((d) => ({ label: fmtDate(d, { weekday: 'short' }), value: byDate[d]?.step_count || 0 }));
    const month = weekLabels(date, 30).map((d) => ({ label: fmtDate(d), value: byDate[d]?.step_count || 0 }));
    panel.innerHTML = `<div class="grid grid-2">
      <div class="card"><div class="card-head"><h2>${date === today() ? "Today's" : fmtDate(date)} steps</h2><span class="badge">Manual entry</span></div>
        <div class="row" style="gap:20px">${ring(pct(count, goal), { size: 140, labelHtml: `<strong>${fmtNum(count)}</strong><span class="tiny muted">of ${fmtNum(goal)}</span>` })}
        <div class="stack grow" style="min-width:180px">
          <form id="sf" class="stack"><div class="field"><label for="sc">Steps</label><input class="input" id="sc" type="number" min="0" max="100000" inputmode="numeric" placeholder="e.g. 6500" required></div>
          <div class="row"><button class="btn btn-primary" name="mode" value="set">${rec ? 'Update total' : 'Save'}</button><button class="btn btn-secondary" name="mode" value="add">Add to total</button></div></form>
          ${rec ? `<button class="btn btn-ghost btn-sm" id="sdel" style="align-self:flex-start">${icon('trash')}Clear this day</button>` : ''}
        </div></div>
        <p class="small muted mt">${count >= goal ? '🎉 Goal reached — great job!' : `${fmtNum(goal - count)} steps to go.`}</p></div>
      <div class="card"><div class="card-head"><h2>Daily goal</h2></div>
        <form id="gf" class="input-group"><label class="sr-only" for="gs">Daily step goal</label><input class="input" id="gs" type="number" min="1000" max="50000" step="500" value="${goal}"><button class="btn btn-secondary">Update goal</button></form>
        <p class="small muted mt-s">Many adults aim for 7,000–10,000 steps a day, but any increase from your usual level counts.</p>
        <h3 class="mt">Last 7 days</h3>${barChart(week, { goal, height: 170 })}</div>
      <div class="card span-2"><div class="card-head"><h2>Last 30 days</h2><span class="small muted">Green bars met your goal</span></div>${barChart(month, { goal, height: 200 })}</div>
    </div>`;
    let mode = 'set';
    panel.querySelectorAll('#sf button').forEach((b) => b.addEventListener('click', () => { mode = b.value; }));
    $('#sf').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await post('/tracker/steps', { step_count: Number($('#sc').value), date, mode }); toast('Steps saved ✓'); reload(); } catch (err) { toastError(err); }
    });
    $('#sdel')?.addEventListener('click', async () => { if (await confirmDialog('Clear the steps for this day?')) { await del(`/tracker/steps/${rec.id}`); reload(); } });
    $('#gf').addEventListener('submit', async (e) => { e.preventDefault(); try { await put('/tracker/steps/goal', { daily_goal: Number($('#gs').value) }); toast('Goal updated'); reload(); } catch (err) { toastError(err); } });
  },

  // ---------------- WATER ----------------
  async water(panel, date, reload) {
    const [day, range] = await Promise.all([getFull('/tracker/water', { date }), getFull('/tracker/water', { from: shiftDate(date, -6), to: date })]);
    const total = day.meta.total_ml; const goal = day.meta.goal_ml;
    const totals = {};
    for (const e of range.data) totals[e.date] = (totals[e.date] || 0) + e.amount_ml;
    const week = weekLabels(date).map((d) => ({ label: fmtDate(d, { weekday: 'short' }), value: totals[d] || 0 }));
    panel.innerHTML = `<div class="grid grid-2">
      <div class="card"><div class="card-head"><h2>Hydration</h2><span class="small muted">${day.data.length} entr${day.data.length === 1 ? 'y' : 'ies'}</span></div>
        <div class="row" style="gap:20px">${ring(pct(total, goal), { size: 140, color: '#0EA5E9', labelHtml: `<strong>${fmtNum(total)} ml</strong><span class="tiny muted">of ${fmtNum(goal)} ml</span>` })}
        <div class="stack grow"><span class="label">Quick add</span>
          <div class="grid grid-2" style="gap:8px">${[150, 250, 500].map((v) => `<button class="btn btn-secondary" data-add="${v}">${icon('droplet')}${v} ml</button>`).join('')}<button class="btn btn-secondary" id="custom">Custom</button></div></div></div>
        <div class="mt">${progressBar(pct(total, goal), 'blue')}</div>
        <p class="small muted mt-s">${total >= goal ? '💧 Hydration goal reached!' : `${fmtNum(goal - total)} ml to go.`} Hydration targets are general guidance — needs vary with climate, activity and health.</p></div>
      <div class="card"><div class="card-head"><h2>Entries</h2></div>
        ${day.data.length ? `<ul class="list">${day.data.map((e) => `<li><span class="grow"><strong>${e.amount_ml} ml</strong> <span class="small muted">at ${fmtTime(e.time)}</span></span>
          <button class="icon-btn sm" data-edit="${e.id}" data-ml="${e.amount_ml}" aria-label="Edit">${icon('edit')}</button><button class="icon-btn sm" data-del="${e.id}" aria-label="Delete">${icon('trash')}</button></li>`).join('')}</ul>` : '<div class="empty small">No water logged yet. Use the quick-add buttons.</div>'}
        <form id="gf" class="input-group mt"><label class="sr-only" for="gw">Daily water goal (ml)</label><input class="input" id="gw" type="number" min="500" max="6000" step="250" value="${goal}"><button class="btn btn-secondary">Update goal</button></form></div>
      <div class="card span-2"><h2>Last 7 days</h2>${barChart(week, { goal, color: '#0EA5E9', unit: ' ml', height: 180 })}</div></div>`;
    const add = async (ml) => { try { await post('/tracker/water', { amount_ml: ml, date, time: date === today() ? nowTime() : '12:00' }); toast(`+${ml} ml`); reload(); } catch (e) { toastError(e); } };
    panel.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => add(Number(b.dataset.add))));
    $('#custom').addEventListener('click', () => modal(`<h2>Custom amount</h2><form id="cf" class="stack"><div class="field"><label for="cml">Amount (ml)</label><input class="input" id="cml" type="number" min="10" max="3000" required></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Add</button></div></form>`, {
      onMount: (el, close) => el.querySelector('#cf').addEventListener('submit', (e) => { e.preventDefault(); close(); add(Number(el.querySelector('#cml').value)); }),
    }));
    panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { try { await del(`/tracker/water/${b.dataset.del}`); toast('Entry removed'); reload(); } catch (e) { toastError(e); } }));
    panel.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => modal(`<h2>Edit entry</h2><form id="ef" class="stack"><div class="field"><label for="eml">Amount (ml)</label><input class="input" id="eml" type="number" min="10" max="3000" value="${b.dataset.ml}"></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>`, {
      onMount: (el, close) => el.querySelector('#ef').addEventListener('submit', async (e) => { e.preventDefault(); try { await patch(`/tracker/water/${b.dataset.edit}`, { amount_ml: Number(el.querySelector('#eml').value) }); close(); reload(); } catch (err) { toastError(err); } }),
    })));
    $('#gf').addEventListener('submit', async (e) => { e.preventDefault(); try { await put('/tracker/water/goal', { daily_goal_ml: Number($('#gw').value) }); toast('Goal updated'); reload(); } catch (err) { toastError(err); } });
  },

  // ---------------- MEALS ----------------
  async meals(panel, date, reload) {
    const res = await getFull('/tracker/meals', { date });
    const t = res.meta.totals;
    const byType = {};
    for (const m of res.data) (byType[m.meal_type] ||= []).push(m);
    const macroTotal = (t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9) || 1;
    const macro = (v, kcal, color, name) => `<div><div class="row between small"><span>${name}</span><strong>${v} g</strong></div>${progressBar(Math.round((v * kcal * 100) / macroTotal), color)}</div>`;
    panel.innerHTML = `<div class="grid grid-2">
      <div class="card"><div class="card-head"><h2>Add food</h2></div>
        <form id="mf" class="stack">
          <div class="field"><label for="mt">Meal</label><select class="input" id="mt">${options(ENUM_LABELS.meal_type, guessMeal())}</select></div>
          <div class="field"><label for="fq">Search foods</label><input class="input" id="fq" placeholder="e.g. roti, dal, banana" autocomplete="off"></div>
          <div id="fresults"></div>
          <div id="basket"></div>
          <details><summary class="small" style="cursor:pointer;min-height:32px">Can't find it? Add a food manually</summary>
            <div class="form-grid mt-s"><div class="field" style="grid-column:1/-1"><label for="mn">Food name</label><input class="input" id="mn"></div>
            <div class="field"><label for="mc">Calories (optional)</label><input class="input" id="mc" type="number" min="0" max="5000"></div>
            <div class="field"><label for="mp">Protein g (optional)</label><input class="input" id="mp" type="number" min="0" max="500"></div>
            <button type="button" class="btn btn-secondary" id="madd" style="grid-column:1/-1">${icon('plus')}Add to meal</button></div></details>
          <button class="btn btn-primary" id="msave">Save meal</button>
        </form>
        <p class="small muted mt-s">Prefer a recipe? Open any recipe and choose “Log as meal”.</p></div>
      <div class="card"><div class="card-head"><h2>Daily nutrition</h2><span class="badge">Estimates</span></div>
        <div class="row" style="align-items:baseline"><span class="stat">${fmtNum(t.calories)}</span><span class="muted">kcal</span></div>
        <div class="stack mt">${macro(t.protein_g, 4, 'green', 'Protein')}${macro(t.carbs_g, 4, 'blue', 'Carbohydrates')}${macro(t.fat_g, 9, 'amber', 'Fat')}
        <div class="row between small"><span>Fiber</span><strong>${t.fiber_g} g</strong></div></div>
        <p class="tiny muted mt">Values are estimates based on typical portions; manual entries without nutrition info are not counted.</p></div>
      <div class="card span-2"><div class="card-head"><h2>Meal diary</h2>
        <form id="hs" class="input-group" style="max-width:320px"><label class="sr-only" for="hq">Search food history</label><input class="input" id="hq" placeholder="Search past meals"><button class="btn btn-secondary">${icon('search')}</button></form></div>
        <div id="diary">${res.data.length ? Object.keys(ENUM_LABELS.meal_type).filter((k) => byType[k]).map((k) => `
          <div class="phase-title">${ENUM_LABELS.meal_type[k]}</div>
          <ul class="list">${byType[k].map((m) => `<li style="align-items:flex-start"><div class="grow"><div>${m.items.map((i) => `${esc(i.name)}${i.quantity_g ? ` <span class="tiny muted">(${i.quantity_g} g)</span>` : ''}`).join(', ')}</div>
            <div class="small muted">${fmtTime(m.time)} · ~${fmtNum(m.totals.calories)} kcal · ${m.totals.protein_g} g protein</div></div>
            <button class="icon-btn sm" data-del="${m.id}" aria-label="Delete meal">${icon('trash')}</button></li>`).join('')}</ul>`).join('') : '<div class="empty">No meals recorded for this day.</div>'}</div></div></div>`;

    const basket = [];
    const drawBasket = () => {
      $('#basket').innerHTML = basket.length ? `<span class="label">In this meal</span><ul class="list">${basket.map((b, i) => `<li><span class="grow small">${esc(b.label)}</span>${b.food_id ? `<input class="input" style="width:90px;min-height:36px" type="number" min="1" max="5000" value="${b.quantity_g}" data-q="${i}" aria-label="Grams of ${esc(b.label)}"><span class="tiny muted">g</span>` : ''}<button type="button" class="icon-btn sm" data-rm="${i}" aria-label="Remove">${icon('x')}</button></li>`).join('')}</ul>` : '';
      $('#basket').querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { basket.splice(Number(b.dataset.rm), 1); drawBasket(); }));
      $('#basket').querySelectorAll('[data-q]').forEach((inp) => inp.addEventListener('change', () => { basket[Number(inp.dataset.q)].quantity_g = Number(inp.value); }));
    };
    let timer;
    const searchFoods = async () => {
      const q = $('#fq').value.trim();
      if (!q) { $('#fresults').innerHTML = ''; return; }
      const list = await get('/foods/search', { q });
      $('#fresults').innerHTML = list.length ? `<ul class="list" style="max-height:220px;overflow:auto;border:1px solid var(--border);border-radius:var(--radius);padding:0 10px">${list.slice(0, 8).map((f) => `<li><span class="grow small"><strong>${esc(f.name)}</strong><br><span class="muted">${esc(f.serving_unit)} ≈ ${f.serving_size_g} g · ~${Math.round((f.calories_per_100g * f.serving_size_g) / 100)} kcal</span></span><button type="button" class="btn btn-secondary btn-sm" data-food='${esc(JSON.stringify({ id: f.id, name: f.name, g: f.serving_size_g, unit: f.serving_unit }))}'>${icon('plus')}Add</button></li>`).join('')}</ul>` : '<div class="small muted">No matches — add it manually below.</div>';
      $('#fresults').querySelectorAll('[data-food]').forEach((b) => b.addEventListener('click', () => {
        const f = JSON.parse(b.dataset.food);
        basket.push({ food_id: f.id, quantity_g: f.g, label: `${f.name} (${f.unit})` });
        drawBasket(); $('#fq').value = ''; $('#fresults').innerHTML = ''; $('#fq').focus();
      }));
    };
    $('#fq').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => searchFoods().catch(() => {}), 200); });
    $('#fq').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
    $('#madd').addEventListener('click', () => {
      const name = $('#mn').value.trim();
      if (!name) { toast('Enter a food name', 'error'); return; }
      basket.push({ name, calories: $('#mc').value ? Number($('#mc').value) : undefined, protein_g: $('#mp').value ? Number($('#mp').value) : undefined, label: name });
      $('#mn').value = ''; $('#mc').value = ''; $('#mp').value = ''; drawBasket();
    });
    $('#mf').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!basket.length) { toast('Add at least one food first', 'error'); return; }
      await withBusy($('#msave'), async () => {
        try {
          await post('/tracker/meals', { meal_type: $('#mt').value, date, time: date === today() ? nowTime() : undefined, items: basket.map(({ label: _l, ...rest }) => rest) });
          toast('Meal saved ✓'); reload();
        } catch (err) { toastError(err); }
      });
    });
    panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { if (await confirmDialog('Delete this meal entry?')) { try { await del(`/tracker/meals/${b.dataset.del}`); toast('Meal deleted'); reload(); } catch (e) { toastError(e); } } }));
    $('#hs').addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = $('#hq').value.trim();
      if (!q) { reload(); return; }
      const r = await get('/tracker/meals', { q });
      $('#diary').innerHTML = r.length ? `<ul class="list">${r.map((m) => `<li><div class="grow"><div>${m.items.map((i) => esc(i.name)).join(', ')}</div><div class="small muted">${fmtDate(m.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${esc(label(m.meal_type))} · ~${fmtNum(m.totals.calories)} kcal</div></div></li>`).join('')}</ul>` : `<div class="empty">No past meals match “${esc(q)}”.</div>`;
    });
  },

  // ---------------- SLEEP ----------------
  async sleep(panel, date, reload, ctx) {
    const res = await getFull('/tracker/sleep', { from: shiftDate(date, -29), to: date });
    const p = ctx.me.profile;
    const byDate = Object.fromEntries(res.data.map((r) => [r.recorded_date, r]));
    const rec = byDate[date];
    const week = weekLabels(date).map((d) => ({ label: fmtDate(d, { weekday: 'short' }), value: byDate[d] ? Math.round((byDate[d].duration_minutes / 60) * 10) / 10 : 0 }));
    const avg = res.meta.weekly_avg_minutes;
    panel.innerHTML = `<div class="grid grid-2">
      <div class="card"><div class="card-head"><h2>Night before ${fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</h2></div>
        <form id="slf" class="form-grid">
          <div class="field"><label for="bt">Bedtime</label><input class="input" id="bt" type="time" value="${rec?.bedtime || p.sleep_time || '22:30'}" required></div>
          <div class="field"><label for="wt">Wake-up time</label><input class="input" id="wt" type="time" value="${rec?.wake_time || p.wake_time || '06:30'}" required></div>
          <div class="field" style="grid-column:1/-1"><label for="sn">Notes <span class="muted">(optional)</span></label><input class="input" id="sn" value="${esc(rec?.notes || '')}" placeholder="e.g. woke up once"></div>
          <div style="grid-column:1/-1" class="row between"><span class="small" id="dur" aria-live="polite"></span><div class="row">${rec ? `<button type="button" class="btn btn-ghost btn-sm" id="sdel">${icon('trash')}Delete</button>` : ''}<button class="btn btn-primary">${rec ? 'Update' : 'Save sleep'}</button></div></div>
        </form></div>
      <div class="card"><div class="card-head"><h2>Summary</h2></div>
        <div class="grid grid-2"><div><div class="small muted">This night</div><div class="stat">${rec ? fmtMin(rec.duration_minutes) : '—'}</div></div><div><div class="small muted">7-day average</div><div class="stat">${fmtMin(avg)}</div></div></div>
        <p class="small muted mt">Preferred schedule: ${fmtTime(p.sleep_time)} → ${fmtTime(p.wake_time)} (<a href="/settings/profile">change</a>)</p>
        <ul class="small" style="padding-left:1.2rem;margin:0"><li>Most adults are advised to get 7–9 hours.</li><li>A consistent bedtime — even at weekends — can help.</li><li>Dimming screens an hour before bed helps many people fall asleep.</li></ul></div>
      <div class="card span-2"><h2>Last 7 nights (hours)</h2>${barChart(week, { goal: 7, color: '#8B5CF6', unit: ' h', height: 180, fmt: (v) => v })}</div>
      <div class="card span-2"><h2>History</h2>${res.data.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Bedtime</th><th>Wake</th><th>Duration</th></tr></thead><tbody>${res.data.slice(0, 14).map((r) => `<tr><td>${fmtDate(r.recorded_date, { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>${fmtTime(r.bedtime)}</td><td>${fmtTime(r.wake_time)}</td><td><strong>${fmtMin(r.duration_minutes)}</strong></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty small">No sleep logged yet.</div>'}</div></div>`;
    const calc = () => {
      const [bh, bm] = $('#bt').value.split(':').map(Number); const [wh, wm] = $('#wt').value.split(':').map(Number);
      if (Number.isNaN(bh) || Number.isNaN(wh)) return;
      const b = bh * 60 + bm; const w = wh * 60 + wm; const d = w > b ? w - b : 1440 - b + w;
      $('#dur').innerHTML = `Duration: <strong>${fmtMin(d)}</strong>`;
    };
    $('#bt').addEventListener('input', calc); $('#wt').addEventListener('input', calc); calc();
    $('#slf').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await post('/tracker/sleep', { bedtime: $('#bt').value, wake_time: $('#wt').value, notes: $('#sn').value, date }); toast('Sleep saved ✓'); reload(); } catch (err) { toastError(err); }
    });
    $('#sdel')?.addEventListener('click', async () => { if (await confirmDialog('Delete this sleep record?')) { await del(`/tracker/sleep/${rec.id}`); reload(); } });
  },

  // ---------------- LAST MEAL ----------------
  async 'last-meal'(panel, date, reload) {
    const [rec, hist] = await Promise.all([get('/tracker/last-meal/today', { date }), get('/tracker/last-meal', { from: shiftDate(date, -13), to: date })]);
    const elapsed = rec ? elapsedSince(date, rec.meal_time) : null;
    panel.innerHTML = `<div class="grid grid-2">
      <div class="card"><div class="card-head"><h2>Last meal ${date === today() ? 'today' : `on ${fmtDate(date)}`}</h2></div>
        ${rec ? `<div class="stat">${fmtTime(rec.meal_time)}</div>${date === today() && elapsed !== null ? `<p class="muted">${fmtMin(elapsed)} since your last meal</p>` : ''}` : '<div class="empty small">Not recorded yet.</div>'}
        <form id="lmf" class="input-group mt"><label class="sr-only" for="lmt">Time of last meal</label><input class="input" id="lmt" type="time" value="${rec?.meal_time || (date === today() ? nowTime() : '20:00')}" required><button class="btn btn-primary">${rec ? 'Update' : 'Save'}</button></form>
        ${date === today() ? '<button class="btn btn-secondary btn-sm mt-s" id="now">I just ate</button>' : ''}
        ${rec ? `<button class="btn btn-ghost btn-sm mt-s" id="lmdel">${icon('trash')}Delete</button>` : ''}
        <p class="small muted mt">This helps you notice your eating rhythm. It isn't a fasting timer — regular, balanced meals matter most, and if you feel very hungry, please eat.</p></div>
      <div class="card"><h2>Recent days</h2>${hist.length ? `<ul class="list">${hist.map((r) => `<li><span>${fmtDate(r.recorded_date, { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong>${fmtTime(r.meal_time)}</strong></li>`).join('')}</ul>` : '<div class="empty small">No history yet.</div>'}</div></div>`;
    const save = async (t) => { try { await post('/tracker/last-meal', { meal_time: t, date }); toast('Saved ✓'); reload(); } catch (e) { toastError(e); } };
    $('#lmf').addEventListener('submit', (e) => { e.preventDefault(); save($('#lmt').value); });
    $('#now')?.addEventListener('click', () => save(nowTime()));
    $('#lmdel')?.addEventListener('click', async () => { await del(`/tracker/last-meal/${rec.id}`); reload(); });
  },

  // ---------------- SUMMARY ----------------
  async summary(panel, date) {
    const s = await get('/tracker/summary', { date });
    const row = (ok, ic, cls, title, value, href) => `<li><span class="check-icon ${ok ? 'done' : ''}">${icon('check')}</span><span class="icon-badge ${cls}">${icon(ic)}</span><span class="grow"><strong>${title}</strong><div class="small muted">${value}</div></span><a class="btn btn-ghost btn-sm" href="${href}">${ok ? 'Edit' : 'Log'}</a></li>`;
    panel.innerHTML = `<div class="grid grid-3">
      <div class="card" style="text-align:center"><h2>Habit completion</h2><div style="display:grid;place-items:center" class="mt">${ring(s.habit_completion_pct, { size: 160, stroke: 14, labelHtml: `<strong style="font-size:1.8rem">${s.habit_completion_pct}%</strong><span class="tiny muted">${Object.values(s.habits).filter(Boolean).length} of 5 habits</span>` })}</div>
        <p class="small muted mt">${s.habit_completion_pct === 100 ? 'Every habit logged — wonderful!' : 'Small, consistent steps add up.'}</p></div>
      <div class="card span-2"><h2>${date === today() ? 'Today' : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <ul class="list check-list">
          ${row(s.habits.steps_logged, 'footprints', 'ib-green', 'Steps', `${fmtNum(s.steps.count)} / ${fmtNum(s.steps.goal)}`, '/tracker/steps')}
          ${row(s.habits.water_logged, 'droplet', 'ib-blue', 'Water', `${fmtNum(s.water.total_ml)} / ${fmtNum(s.water.goal_ml)} ml`, '/tracker/water')}
          ${row(s.habits.meal_logged, 'utensils', 'ib-green', 'Meals', s.meals.count ? `${s.meals.count} recorded · ~${fmtNum(s.meals.nutrition.calories)} kcal, ${s.meals.nutrition.protein_g} g protein (estimates)` : 'None recorded', '/tracker/meals')}
          ${row(s.habits.sleep_logged, 'moon', 'ib-violet', 'Sleep', s.sleep ? `${fmtMin(s.sleep.duration_minutes)} · woke at ${fmtTime(s.wake_time)}` : 'Not logged', '/tracker/sleep')}
          ${row(s.habits.weight_logged, 'scale', 'ib-amber', 'Weight', s.weight_kg ? `${s.weight_kg} kg` : 'Not logged', '/bmi')}
        </ul>
        <div class="grid grid-2 mt small"><div><span class="muted">Last meal:</span> <strong>${fmtTime(s.last_meal_time)}</strong></div><div><span class="muted">Workouts:</span> <strong>${s.workouts.completed} (${s.workouts.minutes} min)</strong></div></div></div></div>`;
  },
};

function guessMeal() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}
