// Reusable BMI calculator widget (works without signing in). Supports cm or ft/in, kg or lb.
import { esc, icon, BMI_LABEL, BMI_COLOR } from './ui.js';

export const BMI_DISCLAIMER = 'BMI is a screening tool and does not directly measure body fat or determine complete health status. Adult BMI categories do not account for muscle mass, bone density, age, sex, ethnicity or pregnancy. Please consult a healthcare professional for a personal assessment.';

export function computeBmi(heightCm, weightKg, age) {
  const h = heightCm / 100;
  const bmi = Math.round((weightKg / (h * h)) * 10) / 10;
  if (age && age < 18) {
    return { bmi, category: null, message: 'Adult BMI categories do not apply to people under 18. Children and teens are assessed with age- and sex-specific growth charts — please ask a doctor or paediatrician.' };
  }
  const category = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'healthy_weight' : bmi < 30 ? 'overweight' : 'obesity';
  return { bmi, category, healthy_range: { min_kg: Math.round(18.5 * h * h * 10) / 10, max_kg: Math.round(24.9 * h * h * 10) / 10 } };
}

export function resultHtml(r) {
  if (!r) return '<div class="empty small">Enter your height and weight, then press <strong>Calculate BMI</strong>.</div>';
  if (!r.category) return `<div class="stat">${r.bmi}</div><div class="banner warn mt-s">${icon('info')}<div>${esc(r.message)}</div></div>`;
  const left = Math.max(0, Math.min(100, ((r.bmi - 15) / 25) * 100));
  const verdict = {
    underweight: ['warn', '⚠️', 'Your BMI is <strong>below</strong> the healthy range.', 'Consider talking to a doctor or dietitian about healthy ways to reach a comfortable weight.'],
    healthy_weight: ['success', '✅', 'Your BMI is in the <strong>healthy range</strong>.', 'Keep up balanced meals, regular activity and good sleep.'],
    overweight: ['warn', '⚠️', 'Your BMI is <strong>above</strong> the healthy range (overweight).', 'Small, steady changes in food, activity and sleep can help. A doctor can give personal advice.'],
    obesity: ['error', '❗', 'Your BMI is <strong>well above</strong> the healthy range (obesity).', 'Please consider speaking with a doctor for a personal health check and support.'],
  }[r.category];
  return `<div class="banner ${verdict[0]} mb" style="font-size:1rem"><span aria-hidden="true">${verdict[1]}</span><div>${verdict[2]}<div class="small" style="margin-top:2px">${verdict[3]}</div></div></div>
    <div class="row" style="align-items:baseline"><span class="stat">${r.bmi}</span><span class="badge ${BMI_COLOR[r.category]}">${BMI_LABEL[r.category]}</span></div>
    <div class="mt"><div class="gauge-bar" role="img" aria-label="BMI ${r.bmi}, ${BMI_LABEL[r.category]}"><div class="gauge-marker" style="left:${left}%"></div></div>
    <div class="gauge-scale"><span style="left:0">15</span><span style="left:14%">18.5</span><span style="left:40%">25</span><span style="left:60%">30</span><span style="left:100%">40</span></div>
    <div class="gauge-labels"><span>Underweight</span><span>Healthy</span><span>Overweight</span><span>Obesity</span></div></div>
    <p class="small mt">Healthy weight range for your height: <strong>${r.healthy_range.min_kg} – ${r.healthy_range.max_kg} kg</strong></p>`;
}

/**
 * Renders the calculator into `el`.
 * opts.heightCm / opts.weightKg / opts.age prefill values; opts.onResult(r, {heightCm, weightKg}) is called after each calculation.
 */
export function mountBmiCalculator(el, opts = {}) {
  const id = (s) => `bmi-${s}`;
  const ftIn = (cm) => { const inches = cm / 2.54; let ft = Math.floor(inches / 12); let inch = Math.round(inches - ft * 12); if (inch === 12) { ft++; inch = 0; } return [ft, inch]; };
  el.innerHTML = `
    <form class="stack" novalidate>
      <div class="field"><span class="label">Height</span>
        <div class="chips" role="group" aria-label="Height unit"><button type="button" class="chip" data-hu="cm" aria-pressed="true">cm</button><button type="button" class="chip" data-hu="ft" aria-pressed="false">ft / in</button></div>
        <div class="input-group" id="${id('hcm')}"><label class="sr-only" for="${id('h')}">Height in centimetres</label><input class="input" id="${id('h')}" type="number" inputmode="decimal" min="50" max="250" step="0.1" placeholder="e.g. 160" value="${opts.heightCm ?? ''}"><span class="muted" style="align-self:center">cm</span></div>
        <div class="input-group" id="${id('hft')}" hidden><label class="sr-only" for="${id('ft')}">Feet</label><input class="input" id="${id('ft')}" type="number" min="1" max="8" placeholder="5" ><span class="muted" style="align-self:center">ft</span><label class="sr-only" for="${id('in')}">Inches</label><input class="input" id="${id('in')}" type="number" min="0" max="11" placeholder="4"><span class="muted" style="align-self:center">in</span></div>
      </div>
      <div class="field"><span class="label">Weight</span>
        <div class="chips" role="group" aria-label="Weight unit"><button type="button" class="chip" data-wu="kg" aria-pressed="true">kg</button><button type="button" class="chip" data-wu="lb" aria-pressed="false">lb</button></div>
        <div class="input-group"><label class="sr-only" for="${id('w')}">Weight</label><input class="input" id="${id('w')}" type="number" inputmode="decimal" min="20" max="660" step="0.1" placeholder="e.g. 62" value="${opts.weightKg ?? ''}"><span class="muted" style="align-self:center" id="${id('wu')}">kg</span></div>
      </div>
      <div class="field"><label for="${id('age')}">Age <span class="muted">(optional)</span></label><input class="input" id="${id('age')}" type="number" min="2" max="120" value="${opts.age ?? ''}"></div>
      <div class="field-error" id="${id('err')}" role="alert"></div>
      <button class="btn btn-primary">${icon('scale')}Calculate BMI</button>
    </form>
    <div class="mt" id="${id('res')}">${resultHtml(null)}</div>
    <p class="disclaimer mt">${BMI_DISCLAIMER}</p>`;

  let hu = 'cm'; let wu = 'kg';
  const $ = (s) => el.querySelector(`#${id(s)}`);
  el.querySelectorAll('[data-hu]').forEach((b) => b.addEventListener('click', () => {
    const cur = readHeight();
    hu = b.dataset.hu;
    el.querySelectorAll('[data-hu]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('hcm').hidden = hu !== 'cm'; $('hft').hidden = hu !== 'ft';
    if (cur) { if (hu === 'ft') { const [f, i] = ftIn(cur); $('ft').value = f; $('in').value = i; } else $('h').value = Math.round(cur * 10) / 10; }
  }));
  el.querySelectorAll('[data-wu]').forEach((b) => b.addEventListener('click', () => {
    const cur = readWeight();
    wu = b.dataset.wu;
    el.querySelectorAll('[data-wu]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('wu').textContent = wu;
    if (cur) $('w').value = wu === 'lb' ? Math.round(cur * 2.20462 * 10) / 10 : Math.round(cur * 10) / 10;
  }));
  function readHeight() {
    if (hu === 'cm') return Number($('h').value) || null;
    const f = Number($('ft').value) || 0; const i = Number($('in').value) || 0;
    return f || i ? (f * 12 + i) * 2.54 : null;
  }
  function readWeight() {
    const v = Number($('w').value) || null;
    return v && wu === 'lb' ? v / 2.20462 : v;
  }
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const heightCm = readHeight(); const weightKg = readWeight(); const age = Number($('age').value) || null;
    const errs = [];
    if (!heightCm || heightCm < 50 || heightCm > 250) errs.push('Please enter a height between 50 and 250 cm (about 1 ft 8 in to 8 ft 2 in).');
    if (!weightKg || weightKg < 20 || weightKg > 300) errs.push('Please enter a weight between 20 and 300 kg (44 to 660 lb).');
    $('err').innerHTML = errs.map(esc).join('<br>');
    if (errs.length) return;
    const r = computeBmi(heightCm, weightKg, age);
    $('res').innerHTML = resultHtml(r);
    opts.onResult?.(r, { heightCm: Math.round(heightCm * 10) / 10, weightKg: Math.round(weightKg * 10) / 10, age });
  });
  if (opts.heightCm && opts.weightKg) el.querySelector('form').requestSubmit();
}
