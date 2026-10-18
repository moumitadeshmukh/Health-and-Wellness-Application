import { patch, put } from '../api.js';
import { esc, icon, $, options, ENUM_LABELS, withBusy, loadDraft, saveDraft, clearDraft } from '../ui.js';

export function render(ctx) {
  const { root, me } = ctx;
  const p = me.profile || {};
  const data = {
    name: p.name || '', age: p.age || '', gender: p.gender || '', height_cm: p.height_cm || '', weight_kg: p.weight_kg || '',
    fitness_goal: p.fitness_goal || 'general_wellness', activity_level: p.activity_level || 'lightly_active', target_weight_kg: '',
    dietary_preference: p.dietary_preference || 'vegetarian', allergies: (p.allergies || []).join(', '), dietary_restrictions: p.dietary_restrictions || '',
    exercise_intensity: p.exercise_intensity || 'beginner',
    wake_time: p.wake_time || '06:30', sleep_time: p.sleep_time || '22:30', step_goal: p.step_goal || 8000, water_goal_ml: p.water_goal_ml || 2500,
  };
  const draft = loadDraft('onboarding');
  let restored = false;
  if (draft?.data) { Object.assign(data, draft.data); restored = true; }
  let step = Math.min(draft?.step || 0, 3);
  const TOTAL = 4;

  const choice = (name, map, desc = {}) => `<div class="grid grid-2">${Object.entries(map).map(([k, v]) => `
    <label class="cat-card" style="min-height:auto" ${data[name] === k ? 'aria-pressed="true"' : ''}>
      <span class="row"><input type="radio" name="${name}" value="${k}" ${data[name] === k ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px"> <strong>${esc(v)}</strong></span>
      ${desc[k] ? `<span class="small muted">${esc(desc[k])}</span>` : ''}
    </label>`).join('')}</div>`;

  const steps = [
    () => `<h2>About you</h2><p class="muted">Let's start with the basics.</p>
      <div class="form-grid">
        <div class="field" style="grid-column:1/-1"><label for="name">Full name <span class="req">*</span></label><input class="input" id="name" value="${esc(data.name)}" required></div>
        <div class="field"><label for="age">Age <span class="req">*</span></label><input class="input" id="age" type="number" inputmode="numeric" min="13" max="120" value="${esc(data.age)}"><div class="field-hint">Must be 13 or older.</div></div>
        <div class="field"><label for="gender">Gender <span class="muted">(optional)</span></label><select class="input" id="gender"><option value="">Skip</option>${options(ENUM_LABELS.gender, data.gender)}</select></div>
      </div>`,
    () => `<h2>Body & goals</h2><p class="muted">Used to calculate your BMI and personalise your goals.</p>
      <div class="form-grid">
        <div class="field"><label for="height_cm">Height (cm) <span class="req">*</span></label><input class="input" id="height_cm" type="number" inputmode="decimal" min="50" max="250" step="0.1" value="${esc(data.height_cm)}"><div class="field-hint">5 ft = 152 cm · 5 ft 6 in = 168 cm</div></div>
        <div class="field"><label for="weight_kg">Weight (kg) <span class="req">*</span></label><input class="input" id="weight_kg" type="number" inputmode="decimal" min="20" max="300" step="0.1" value="${esc(data.weight_kg)}"></div>
      </div>
      <div id="ob-bmi" class="mt-s" aria-live="polite"></div>
      <h3 class="mt">Fitness goal <span class="req">*</span></h3>
      ${choice('fitness_goal', ENUM_LABELS.fitness_goal)}
      <h3 class="mt">Activity level</h3>
      ${choice('activity_level', ENUM_LABELS.activity_level, { sedentary: 'Mostly sitting', lightly_active: 'Light walking most days', moderately_active: 'Exercise 3–5 days a week', very_active: 'Hard exercise or active job' })}
      <div class="field mt"><label for="target_weight_kg">Target weight (kg) <span class="muted">(optional)</span></label><input class="input" id="target_weight_kg" type="number" min="20" max="300" step="0.1" value="${esc(data.target_weight_kg)}"></div>`,
    () => `<h2>Food preferences</h2><p class="muted">We'll use this to filter recipes and meal ideas.</p>
      ${choice('dietary_preference', ENUM_LABELS.dietary_preference)}
      <div class="field mt"><label for="allergies">Food allergies</label><input class="input" id="allergies" placeholder="e.g. peanuts, dairy, gluten" value="${esc(data.allergies)}"><div class="field-hint">Separate with commas. Recipes containing these are hidden.</div></div>
      <div class="field mt"><label for="dietary_restrictions">Other dietary restrictions <span class="muted">(optional)</span></label><input class="input" id="dietary_restrictions" placeholder="e.g. no onion & garlic, low salt" value="${esc(data.dietary_restrictions)}"></div>`,
    () => `<h2>Exercise & daily schedule</h2><p class="muted">Choose an intensity that feels right — you can change it any time.</p>
      ${choice('exercise_intensity', ENUM_LABELS.exercise_intensity, { beginner: 'New to exercise or returning after a break', intermediate: 'Exercise regularly', advanced: 'Train often and comfortably' })}
      <div class="form-grid mt">
        <div class="field"><label for="wake_time">Usual wake-up time</label><input class="input" id="wake_time" type="time" value="${esc(data.wake_time)}"></div>
        <div class="field"><label for="sleep_time">Usual bedtime</label><input class="input" id="sleep_time" type="time" value="${esc(data.sleep_time)}"></div>
        <div class="field"><label for="step_goal">Daily step goal</label><input class="input" id="step_goal" type="number" min="1000" max="50000" step="500" value="${esc(data.step_goal)}"></div>
        <div class="field"><label for="water_goal_ml">Daily water goal (ml)</label><input class="input" id="water_goal_ml" type="number" min="500" max="6000" step="250" value="${esc(data.water_goal_ml)}"><div class="field-hint">General guidance only; needs vary.</div></div>
      </div>`,
  ];

  const collect = () => {
    root.querySelectorAll('input:not([type=radio]), select').forEach((el) => { if (el.id in data) data[el.id] = el.value; });
    root.querySelectorAll('input[type=radio]:checked').forEach((el) => { data[el.name] = el.value; });
  };

  const validate = () => {
    const errs = [];
    if (step === 0) {
      if (!data.name.trim()) errs.push('Please enter your name.');
      const age = Number(data.age);
      if (!Number.isInteger(age) || age < 13 || age > 120) errs.push('Please enter an age between 13 and 120.');
    }
    if (step === 1) {
      if (!(Number(data.height_cm) >= 50 && Number(data.height_cm) <= 250)) errs.push('Height should be between 50 and 250 cm.');
      if (!(Number(data.weight_kg) >= 20 && Number(data.weight_kg) <= 300)) errs.push('Weight should be between 20 and 300 kg.');
    }
    if (step === 1 && data.target_weight_kg && !(Number(data.target_weight_kg) >= 20 && Number(data.target_weight_kg) <= 300)) errs.push('Target weight should be between 20 and 300 kg.');
    if (step === 3) {
      if (!(Number(data.step_goal) >= 1000 && Number(data.step_goal) <= 50000)) errs.push('Step goal should be between 1,000 and 50,000.');
      if (!(Number(data.water_goal_ml) >= 500 && Number(data.water_goal_ml) <= 6000)) errs.push('Water goal should be between 500 and 6,000 ml.');
    }
    return errs;
  };

  const draw = () => {
    root.innerHTML = `<div class="auth-bg"><div class="auth-card" style="max-width:620px">
      <a class="auth-brand" href="/onboarding"><img src="/icon.svg" alt="">WellnessApp</a>
      <div class="card">
        <div class="stepper" aria-label="Step ${step + 1} of ${TOTAL}">${Array.from({ length: TOTAL }, (_, i) => `<span class="${i <= step ? 'on' : ''}"></span>`).join('')}</div>
        <div class="tiny muted mb">Step ${step + 1} of ${TOTAL}</div>
        ${restored ? `<div class="banner success mb" id="restored">${icon('check')}<div class="grow">Draft restored — you can pick up where you left off.</div><button type="button" class="icon-btn sm" id="dismiss-draft" aria-label="Dismiss">${icon('x')}</button></div>` : ''}
        <div class="banner info mb">${icon('info')}<div class="small">WellnessApp gives general wellness information only. It is not a medical service and can't diagnose or treat conditions.</div></div>
        <form id="f" novalidate>${steps[step]()}<div id="errs"></div>
          <div class="row between mt">
            ${step > 0 ? '<button type="button" class="btn btn-secondary" id="back">Back</button>' : '<span></span>'}
            <button class="btn btn-primary" id="next">${step === TOTAL - 1 ? 'Finish setup' : 'Continue'}</button>
          </div>
        </form>
      </div>
      <p class="disclaimer mt" style="text-align:center">Your data stays on this computer. WellnessApp provides general wellness information, not medical advice.</p>
    </div></div>`;
    root.querySelectorAll('label.cat-card input').forEach((r) => r.addEventListener('change', () => {
      root.querySelectorAll(`input[name="${r.name}"]`).forEach((o) => o.closest('label').setAttribute('aria-pressed', String(o.checked)));
    }));
    $('#dismiss-draft')?.addEventListener('click', () => { restored = false; $('#restored').remove(); });
    const showBmi = () => {
      const h = Number($('#height_cm')?.value); const w = Number($('#weight_kg')?.value);
      const box = $('#ob-bmi'); if (!box) return;
      if (!(h >= 50 && h <= 250 && w >= 20 && w <= 300)) { box.innerHTML = ''; return; }
      const bmi = Math.round((w / (h / 100) ** 2) * 10) / 10;
      const cat = bmi < 18.5 ? ['Below the healthy range', 'warn'] : bmi < 25 ? ['In the healthy range ✓', 'success'] : bmi < 30 ? ['Above the healthy range (overweight)', 'warn'] : ['Well above the healthy range (obesity)', 'error'];
      box.innerHTML = `<div class="banner ${cat[1]}"><div>Your BMI is <strong>${bmi}</strong> — ${cat[0]}${Number(data.age) < 18 ? ' (adult categories don\'t apply under 18)' : ''}. Healthy weight for your height: ${(18.5 * (h / 100) ** 2).toFixed(1)}–${(24.9 * (h / 100) ** 2).toFixed(1)} kg.</div></div>`;
    };
    $('#height_cm')?.addEventListener('input', showBmi); $('#weight_kg')?.addEventListener('input', showBmi); showBmi();
    $('#f').addEventListener('input', () => { collect(); saveDraft('onboarding', { step, data }); });
    $('#back')?.addEventListener('click', () => { collect(); step--; saveDraft('onboarding', { step, data }); draw(); });
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      collect();
      const errs = validate();
      if (errs.length) { $('#errs').innerHTML = `<div class="banner error mt">${icon('alert')}<div>${errs.map(esc).join('<br>')}</div></div>`; return; }
      if (step < TOTAL - 1) { step++; restored = false; saveDraft('onboarding', { step, data }); draw(); root.querySelector('input, select')?.focus(); return; }
      await withBusy($('#next'), async () => {
        try {
          await patch('/users/me/profile', {
            name: data.name.trim(), age: Number(data.age), gender: data.gender || null, height_cm: Number(data.height_cm), weight_kg: Number(data.weight_kg),
            fitness_goal: data.fitness_goal, activity_level: data.activity_level, dietary_preference: data.dietary_preference,
            allergies: data.allergies, dietary_restrictions: data.dietary_restrictions, exercise_intensity: data.exercise_intensity,
            wake_time: data.wake_time, sleep_time: data.sleep_time, step_goal: Number(data.step_goal), water_goal_ml: Number(data.water_goal_ml), onboarded: true,
          });
          if (data.target_weight_kg) await put('/weight/goal', { target_weight_kg: Number(data.target_weight_kg) });
          clearDraft('onboarding');
          await ctx.refreshMe();
          try { sessionStorage.setItem('wa-tiara-greet', '1'); } catch { /* ignore */ }
          ctx.navigate('/dashboard', { replace: true });
        } catch (err) {
          $('#errs').innerHTML = `<div class="banner error mt">${icon('alert')}<div>${esc(err.message)}</div></div>`;
        }
      }, 'Saving…');
    });
  };
  draw();
}
