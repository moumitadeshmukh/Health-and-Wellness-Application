import { get, getFull, post, put, patch, del } from '../api.js';
import { mountBmiCalculator } from '../bmi-calc.js';
import {
  esc, icon, $, lineChart, fmtDate, today, shiftDate, progressBar, skeleton, errorBox, toast, toastError, withBusy, confirmDialog, modal,
  wireDraft, clearDraft,
} from '../ui.js';

const DISCLAIMER = 'BMI is a screening tool and does not directly measure body fat or determine complete health status. Adult BMI categories do not account for muscle mass, bone density, age, sex, ethnicity or pregnancy. Please consult a healthcare professional for a personal assessment.';

async function allWeights() {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const r = await getFull('/weight', { from: shiftDate(today(), -365 * 5), to: today(), page, limit: 100 });
    out.push(...r.data);
    if (out.length >= r.meta.total || !r.data.length) break;
  }
  return out;
}

function aggregate(records, view) {
  const asc = [...records].sort((a, b) => (a.recorded_date > b.recorded_date ? 1 : -1));
  if (view === 'daily') {
    const days = Array.from({ length: 30 }, (_, i) => shiftDate(today(), i - 29));
    const map = Object.fromEntries(asc.map((r) => [r.recorded_date, r.weight_kg]));
    return days.map((d) => ({ label: fmtDate(d), value: map[d] ?? null }));
  }
  const keyOf = {
    weekly: (d) => { const [y, m, dd] = d.split('-').map(Number); const x = new Date(y, m - 1, dd); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); },
    monthly: (d) => d.slice(0, 7),
    yearly: (d) => d.slice(0, 4),
  }[view];
  const groups = new Map();
  for (const r of asc) { const k = keyOf(r.recorded_date); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.weight_kg); }
  const limit = { weekly: 12, monthly: 12, yearly: 5 }[view];
  return [...groups.entries()].slice(-limit).map(([k, v]) => ({
    label: view === 'weekly' ? `wk ${fmtDate(k)}` : view === 'monthly' ? new Date(`${k}-01T00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : k,
    value: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10,
  }));
}

export async function render(ctx) {
  const { root } = ctx;
  let view = 'daily';
  root.innerHTML = `<div class="page-head"><div><h1>BMI & Weight</h1></div></div>${skeleton(3)}`;

  const load = async () => {
    let me; let weights; let goal;
    try {
      [me, weights, goal] = await Promise.all([get('/users/me'), allWeights(), get('/weight/goal')]);
    } catch (e) { root.innerHTML = errorBox(e); root.querySelector('[data-retry]')?.addEventListener('click', load); return; }
    const p = me.profile;

    let goalHtml = '<div class="empty small">No target set yet.</div>';
    if (goal.target_weight_kg) {
      const start = goal.start_weight_kg ?? goal.current_weight_kg;
      const total = start - goal.target_weight_kg;
      const done = total ? Math.max(0, Math.min(100, Math.round(((start - goal.current_weight_kg) / total) * 100))) : 100;
      const diff = goal.current_weight_kg - goal.target_weight_kg;
      goalHtml = `<div class="row between"><div><div class="small muted">Current</div><div class="stat">${goal.current_weight_kg ?? '—'}<small> kg</small></div></div>
        <div style="text-align:right"><div class="small muted">Target</div><div class="stat">${goal.target_weight_kg}<small> kg</small></div></div></div>
        <div class="mt-s">${progressBar(done, 'amber')}</div>
        <div class="small muted mt-s">${Math.abs(diff) < 0.05 ? '🎉 You have reached your target!' : `${Math.abs(diff).toFixed(1)} kg to ${diff > 0 ? 'lose' : 'gain'}`} · started at ${start ?? '—'} kg${goal.target_date ? ` · target date ${fmtDate(goal.target_date, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>`;
    }

    root.innerHTML = `
      <div class="page-head"><div><h1>BMI & Weight</h1><p>Understand your BMI, track your weight and set realistic goals.</p></div></div>
      <div class="banner info mb">${icon('info')}<div>${DISCLAIMER}</div></div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h2>Check your BMI</h2>${p.height_cm ? `<span class="small muted">Profile: ${p.height_cm} cm</span>` : ''}</div>
          <p class="small muted">Enter or adjust your height and weight. You can use cm or feet/inches, and kg or lb.</p>
          <div id="bmi-widget"></div>
          <div id="bmi-save" class="mt-s"></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Weight goal</h2><button class="btn btn-ghost btn-sm" id="edit-goal">${icon('target')}${goal.target_weight_kg ? 'Change' : 'Set goal'}</button></div>
          ${goalHtml}
          <h3 class="mt">Log today's weight</h3>
          <form id="w-form" class="row" style="align-items:flex-end">
            <div class="field" style="flex:1;min-width:120px"><label for="nw">Weight (kg)</label><input class="input" id="nw" type="number" step="0.1" min="20" max="300" required></div>
            <div class="field" style="flex:1;min-width:140px"><label for="nd">Date</label><input class="input" id="nd" type="date" max="${today()}" value="${today()}"></div>
            <div class="field" style="flex-basis:100%"><label for="nn">Notes <span class="muted">(optional)</span></label><input class="input" id="nn" maxlength="300" placeholder="e.g. after morning walk"></div>
            <button class="btn btn-primary" id="w-save">${icon('plus')}Save</button>
          </form>
          <p class="small muted mt-s">Tip: weigh yourself at the same time of day, e.g. in the morning, for more consistent trends.</p>
        </div>
        <div class="card span-2">
          <div class="card-head"><h2>Weight history</h2>
            <div class="chips" role="tablist">${['daily', 'weekly', 'monthly', 'yearly'].map((v) => `<button class="chip" role="tab" aria-pressed="${v === view}" data-view="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>
          </div>
          ${lineChart(aggregate(weights, view), { color: '#F59E0B', unit: ' kg', goal: goal.target_weight_kg || undefined, fmt: (v) => v })}
        </div>
        <div class="card span-2">
          <div class="card-head"><h2>Entries</h2><span class="small muted">${weights.length} total</span></div>
          ${weights.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Weight</th><th>Notes</th><th></th></tr></thead><tbody>
            ${weights.slice(0, 30).map((r) => `<tr><td>${fmtDate(r.recorded_date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><strong>${r.weight_kg} kg</strong></td><td class="small muted">${esc(r.notes || '')}</td>
            <td style="text-align:right;white-space:nowrap"><button class="icon-btn sm" data-edit="${r.id}" data-w="${r.weight_kg}" aria-label="Edit entry">${icon('edit')}</button><button class="icon-btn sm" data-del="${r.id}" aria-label="Delete entry">${icon('trash')}</button></td></tr>`).join('')}
          </tbody></table></div>` : '<div class="empty">No weight entries yet.</div>'}
        </div>
      </div>
      <div class="card mt"><h3>Healthy, sustainable weight management</h3>
        <ul class="small" style="margin:0;padding-left:1.2rem">
          <li>Many health guidelines suggest a gradual change of about 0.25–1 kg per week.</li>
          <li>Focus on habits you can keep: regular meals, vegetables and protein, daily movement and good sleep.</li>
          <li>Avoid crash diets, extreme calorie restriction or long fasting.</li>
          <li>If you have a medical condition, are pregnant, or are under 18, please get personal advice from a healthcare professional.</li>
        </ul></div>`;

    mountBmiCalculator($('#bmi-widget'), {
      heightCm: p.height_cm, weightKg: goal.current_weight_kg, age: p.age,
      onResult: (r, vals) => {
        const changed = vals.heightCm !== p.height_cm || vals.weightKg !== goal.current_weight_kg;
        $('#bmi-save').innerHTML = changed ? `<button class="btn btn-secondary btn-block" id="save-hw">${icon('check')}Save ${vals.heightCm} cm and ${vals.weightKg} kg to my profile</button>` : '';
        $('#save-hw')?.addEventListener('click', async (e) => withBusy(e.currentTarget, async () => {
          try {
            await patch('/users/me/profile', { height_cm: vals.heightCm });
            if (vals.weightKg !== goal.current_weight_kg) await post('/weight', { weight_kg: vals.weightKg, date: today(), notes: 'From BMI calculator' });
            await ctx.refreshMe(); toast('Height and weight saved ✓'); load();
          } catch (err) { toastError(err); }
        }));
      },
    });
    wireDraft($('#w-form'), 'weight', ['nw', 'nn']);
    $('#w-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await withBusy($('#w-save'), async () => {
        try { await post('/weight', { weight_kg: Number($('#nw').value), date: $('#nd').value || today(), notes: $('#nn').value }); clearDraft('weight'); toast('Weight saved ✓'); load(); } catch (err) { toastError(err); }
      });
    });
    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; load(); }));
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmDialog('Delete this weight entry?'))) return;
      try { await del(`/weight/${b.dataset.del}`); toast('Entry deleted'); load(); } catch (err) { toastError(err); }
    }));
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
      modal(`<h2>Edit weight</h2><form id="ef" class="stack"><div class="field"><label for="ew">Weight (kg)</label><input class="input" id="ew" type="number" step="0.1" min="20" max="300" value="${b.dataset.w}"></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>`, {
        onMount: (el, close) => el.querySelector('#ef').addEventListener('submit', async (e) => {
          e.preventDefault();
          try { await patch(`/weight/${b.dataset.edit}`, { weight_kg: Number(el.querySelector('#ew').value) }); close(); toast('Updated'); load(); } catch (err) { toastError(err); }
        }),
      });
    }));
    $('#edit-goal').addEventListener('click', () => {
      modal(`<h2>Weight goal</h2><form id="gf" class="stack">
        <div class="field"><label for="gt">Target weight (kg)</label><input class="input" id="gt" type="number" step="0.1" min="20" max="300" value="${goal.target_weight_kg ?? ''}" required></div>
        <div class="field"><label for="gd">Target date <span class="muted">(optional)</span></label><input class="input" id="gd" type="date" min="${today()}" value="${goal.target_date ?? ''}"></div>
        ${p.height_cm ? `<p class="small muted">The healthy BMI range for your height is about ${(18.5 * (p.height_cm / 100) ** 2).toFixed(1)}–${(24.9 * (p.height_cm / 100) ** 2).toFixed(1)} kg.</p>` : ''}
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Save goal</button></div></form>`, {
        onMount: (el, close) => el.querySelector('#gf').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const r = await put('/weight/goal', { target_weight_kg: Number(el.querySelector('#gt').value), target_date: el.querySelector('#gd').value || undefined });
            close();
            if (r.warning) modal(`<h2>Goal saved</h2><div class="banner warn">${icon('alert')}<div>${esc(r.warning)}</div></div><div class="row mt" style="justify-content:flex-end"><button class="btn btn-primary" data-close>OK</button></div>`);
            else toast('Goal saved ✓');
            load();
          } catch (err) { toastError(err); }
        }),
      });
    });
  };
  await load();
}
