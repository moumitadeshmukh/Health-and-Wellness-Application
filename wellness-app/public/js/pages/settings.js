import { get, post, put, patch, del } from '../api.js';
import { esc, icon, $, options, ENUM_LABELS, toast, toastError, withBusy, fmtTime, skeleton, errorBox, confirmDialog, getThemePref, setThemePref } from '../ui.js';
import { exportData } from './progress.js';

const TABS = [['profile', '👤 Profile'], ['goals', '🎯 Goals & Targets'], ['reminders', '🔔 Reminders'], ['appearance', '🎨 Appearance'], ['ai', '💬 Tiara (AI)'], ['privacy', '🔒 Privacy & Data']];
const REMINDERS = { water: 'Drink water', meal: 'Record meals', movement: 'Movement break', workout: 'Complete workout', bedtime: 'Prepare for bedtime', weight_log: 'Log weight', progress_review: 'Review daily progress' };
const FREQ = { daily: 'Every day', weekdays: 'Weekdays', weekends: 'Weekends' };

export async function render(ctx) {
  const { root, params } = ctx;
  const tab = TABS.some(([k]) => k === params.tab) ? params.tab : 'profile';
  root.innerHTML = `<div class="page-head"><div><h1>Profile & Settings</h1><p>${esc(ctx.me.user.email)}</p></div></div>
    <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<a class="tab" role="tab" href="/settings/${k}" aria-selected="${k === tab}">${l}</a>`).join('')}</nav>
    <div id="panel">${skeleton(1, 'grid-2')}</div>`;
  const panel = $('#panel');
  try { await PANELS[tab](panel, ctx); } catch (e) { panel.innerHTML = errorBox(e, false); }
}

const PANELS = {
  async profile(panel, ctx) {
    const me = await get('/users/me');
    const p = me.profile;
    panel.innerHTML = `<div class="card" style="max-width:760px"><form id="pf" class="form-grid" novalidate>
      <div class="field" style="grid-column:1/-1"><label for="name">Full name</label><input class="input" id="name" value="${esc(p.name || '')}" required></div>
      <div class="field"><label for="age">Age</label><input class="input" id="age" type="number" min="13" max="120" value="${p.age ?? ''}"></div>
      <div class="field"><label for="gender">Gender (optional)</label><select class="input" id="gender"><option value="">Prefer not to say</option>${options(ENUM_LABELS.gender, p.gender)}</select></div>
      <div class="field"><label for="height_cm">Height (cm)</label><input class="input" id="height_cm" type="number" step="0.1" min="50" max="250" value="${p.height_cm ?? ''}"></div>
      <div class="field"><label for="weight_kg">Current weight (kg)</label><input class="input" id="weight_kg" type="number" step="0.1" min="20" max="300" value="${p.weight_kg ?? ''}"><div class="field-hint">To track changes over time, log weight on the BMI page.</div></div>
      <div class="field"><label for="fitness_goal">Fitness goal</label><select class="input" id="fitness_goal">${options(ENUM_LABELS.fitness_goal, p.fitness_goal)}</select></div>
      <div class="field"><label for="activity_level">Activity level</label><select class="input" id="activity_level">${options(ENUM_LABELS.activity_level, p.activity_level)}</select></div>
      <div class="field"><label for="dietary_preference">Dietary preference</label><select class="input" id="dietary_preference">${options(ENUM_LABELS.dietary_preference, p.dietary_preference)}</select></div>
      <div class="field"><label for="exercise_intensity">Exercise intensity</label><select class="input" id="exercise_intensity">${options(ENUM_LABELS.exercise_intensity, p.exercise_intensity)}</select></div>
      <div class="field" style="grid-column:1/-1"><label for="allergies">Food allergies</label><input class="input" id="allergies" value="${esc((p.allergies || []).join(', '))}" placeholder="e.g. peanuts, dairy"><div class="field-hint">Comma separated. Recipes and AI meal ideas will avoid these.</div></div>
      <div class="field" style="grid-column:1/-1"><label for="dietary_restrictions">Other dietary restrictions</label><input class="input" id="dietary_restrictions" value="${esc(p.dietary_restrictions || '')}"></div>
      <div class="field"><label for="wake_time">Wake-up time</label><input class="input" id="wake_time" type="time" value="${p.wake_time || ''}"></div>
      <div class="field"><label for="sleep_time">Bedtime</label><input class="input" id="sleep_time" type="time" value="${p.sleep_time || ''}"></div>
      <div id="perr" style="grid-column:1/-1"></div>
      <div style="grid-column:1/-1"><button class="btn btn-primary" id="psave">Save changes</button></div>
    </form></div>`;
    $('#pf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {};
      for (const k of ['name', 'fitness_goal', 'activity_level', 'dietary_preference', 'exercise_intensity', 'allergies', 'dietary_restrictions']) body[k] = $(`#${k}`).value;
      body.gender = $('#gender').value || null;
      for (const k of ['age', 'height_cm', 'weight_kg']) if ($(`#${k}`).value) body[k] = Number($(`#${k}`).value);
      for (const k of ['wake_time', 'sleep_time']) if ($(`#${k}`).value) body[k] = $(`#${k}`).value;
      await withBusy($('#psave'), async () => {
        try { await patch('/users/me/profile', body); await ctx.refreshMe(); $('#perr').innerHTML = `<div class="banner success">${icon('check')}<div>Profile saved.</div></div>`; }
        catch (err) { $('#perr').innerHTML = `<div class="banner error">${icon('alert')}<div>${esc(err.message)}</div></div>`; }
      });
    });
  },

  async goals(panel) {
    const [me, wg] = await Promise.all([get('/users/me'), get('/weight/goal')]);
    const p = me.profile;
    panel.innerHTML = `<div class="grid grid-3">
      <form class="card stack" id="g1"><h2>Daily steps</h2><div class="field"><label for="sg">Steps per day</label><input class="input" id="sg" type="number" min="1000" max="50000" step="500" value="${p.step_goal || 8000}"></div><button class="btn btn-primary">Save</button></form>
      <form class="card stack" id="g2"><h2>Daily water</h2><div class="field"><label for="wgm">Millilitres per day</label><input class="input" id="wgm" type="number" min="500" max="6000" step="250" value="${p.water_goal_ml || 2500}"></div><p class="tiny muted">General guidance only — needs vary with climate, activity and health.</p><button class="btn btn-primary">Save</button></form>
      <form class="card stack" id="g3"><h2>Weight target</h2><div class="field"><label for="tw">Target (kg)</label><input class="input" id="tw" type="number" step="0.1" min="20" max="300" value="${wg.target_weight_kg ?? ''}" required></div>
        <div class="field"><label for="td">Target date (optional)</label><input class="input" id="td" type="date" value="${wg.target_date ?? ''}"></div><div id="gw"></div><button class="btn btn-primary">Save</button></form></div>`;
    $('#g1').addEventListener('submit', async (e) => { e.preventDefault(); try { await put('/tracker/steps/goal', { daily_goal: Number($('#sg').value) }); toast('Step goal saved ✓'); } catch (err) { toastError(err); } });
    $('#g2').addEventListener('submit', async (e) => { e.preventDefault(); try { await put('/tracker/water/goal', { daily_goal_ml: Number($('#wgm').value) }); toast('Water goal saved ✓'); } catch (err) { toastError(err); } });
    $('#g3').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const r = await put('/weight/goal', { target_weight_kg: Number($('#tw').value), target_date: $('#td').value || undefined }); $('#gw').innerHTML = r.warning ? `<div class="banner warn">${icon('alert')}<div>${esc(r.warning)}</div></div>` : ''; toast('Weight goal saved ✓'); }
      catch (err) { toastError(err); }
    });
  },

  async reminders(panel) {
    const draw = async () => {
      const list = await get('/reminders');
      const perm = 'Notification' in window ? Notification.permission : 'unsupported';
      panel.innerHTML = `<div class="grid grid-2">
        <div class="card"><h2>Your reminders</h2>
          ${list.length ? `<ul class="list">${list.map((r) => `<li><div class="grow"><strong class="small">${esc(REMINDERS[r.reminder_type])}</strong><div class="small muted">${fmtTime(r.scheduled_time)} · ${esc(FREQ[r.frequency] || r.frequency)}${r.label ? ` · “${esc(r.label)}”` : ''}</div></div>
            <label class="switch"><input type="checkbox" data-toggle="${r.id}" ${r.is_enabled ? 'checked' : ''} aria-label="Enable ${esc(REMINDERS[r.reminder_type])} reminder"><span></span></label>
            <button class="icon-btn sm" data-del="${r.id}" aria-label="Delete reminder">${icon('trash')}</button></li>`).join('')}</ul>` : '<div class="empty small">No reminders yet.</div>'}
          <div class="mt">${perm === 'granted' ? `<div class="banner success">${icon('check')}<div>Browser notifications are on.</div></div>` : perm === 'unsupported' ? '' : `<div class="banner info">${icon('bell')}<div>Reminders appear in the app's notification bell while WellnessApp is open. <button class="btn btn-secondary btn-sm mt-s" id="perm">Also show browser notifications</button></div></div>`}</div>
          <p class="tiny muted mt-s">Reminders only fire while WellnessApp is open in a browser tab.</p></div>
        <form class="card stack" id="rf"><h2>Add a reminder</h2>
          <div class="field"><label for="rt">Type</label><select class="input" id="rt">${options(REMINDERS)}</select></div>
          <div class="form-grid"><div class="field"><label for="rtime">Time</label><input class="input" id="rtime" type="time" value="10:00" required></div>
          <div class="field"><label for="rfreq">Repeat</label><select class="input" id="rfreq">${options(FREQ, 'daily')}</select></div></div>
          <div class="field"><label for="rlabel">Custom message (optional)</label><input class="input" id="rlabel" maxlength="100"></div>
          <button class="btn btn-primary">${icon('plus')}Add reminder</button>
          <button type="button" class="btn btn-secondary" id="defaults">Add a recommended set</button></form></div>`;
      panel.querySelectorAll('[data-toggle]').forEach((c) => c.addEventListener('change', async () => { try { await patch(`/reminders/${c.dataset.toggle}`, { is_enabled: c.checked }); } catch (e) { toastError(e); } }));
      panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { try { await del(`/reminders/${b.dataset.del}`); draw(); } catch (e) { toastError(e); } }));
      $('#perm')?.addEventListener('click', async () => { await Notification.requestPermission(); draw(); });
      $('#rf').addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await post('/reminders', { reminder_type: $('#rt').value, scheduled_time: $('#rtime').value, frequency: $('#rfreq').value, label: $('#rlabel').value }); toast('Reminder added ✓'); draw(); } catch (err) { toastError(err); }
      });
      $('#defaults').addEventListener('click', async () => {
        const set = [['water', '10:00'], ['water', '15:00'], ['meal', '13:30'], ['movement', '16:30'], ['workout', '18:00'], ['bedtime', '22:00'], ['progress_review', '21:00']];
        try { for (const [t, time] of set) await post('/reminders', { reminder_type: t, scheduled_time: time, frequency: 'daily' }); toast('Recommended reminders added'); draw(); } catch (err) { toastError(err); }
      });
    };
    await draw();
  },

  async ai(panel) {
    const draw = async () => {
      const st = await get('/settings/ai');
      panel.innerHTML = `<div class="grid grid-2">
        <div class="card">
          <h2>Tiara status</h2>
          ${st.enabled
            ? `<div class="banner success">${icon('check')}<div><strong>Connected.</strong> Tiara answers customers' questions using Claude (${esc(st.model)}). Key ${esc(st.key_hint)}.</div></div>
               <button class="btn btn-secondary mt" id="ai-remove">Disconnect AI</button>`
            : `<div class="banner warn">${icon('info')}<div><strong>Built-in answers only.</strong> Without an AI key, Tiara can only answer common wellness topics. Connect Claude so it can understand and answer any question customers ask.</div></div>`}
          <p class="small muted mt">The key is saved only in the <code>.env</code> file on this computer. Customers never see it. Only a short profile summary (first name, age, goals, 7-day averages) is sent with each question — never email or passwords. Safety rules (no diagnosis, emergency detection, allergy checks) stay on.</p>
        </div>
        <form class="card stack" id="ai-form"><h2>${st.enabled ? 'Change API key' : 'Connect Claude'}</h2>
          <ol class="small" style="padding-left:1.2rem;margin:0">
            <li>Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>, sign in and add billing credit.</li>
            <li>Create an API key and copy it (it starts with <code>sk-ant-</code>).</li>
            <li>Paste it below and press <strong>Test & save</strong>.</li>
          </ol>
          <div class="field"><label for="ai-key">Anthropic API key</label><input class="input" id="ai-key" type="password" autocomplete="off" placeholder="sk-ant-..." required></div>
          <div id="ai-msg"></div>
          <button class="btn btn-primary" id="ai-save">${icon('check')}Test & save</button>
        </form></div>`;
      $('#ai-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await withBusy($('#ai-save'), async () => {
          try {
            const r = await put('/settings/ai', { api_key: $('#ai-key').value.trim() });
            toast(r.message || 'AI connected');
            draw();
          } catch (err) { $('#ai-msg').innerHTML = `<div class="banner error">${icon('alert')}<div>${esc(err.message)}</div></div>`; }
        }, 'Testing…');
      });
      $('#ai-remove')?.addEventListener('click', async () => {
        if (!(await confirmDialog('Disconnect the AI? Tiara will go back to built-in answers.', { okText: 'Disconnect' }))) return;
        await del('/settings/ai'); toast('AI disconnected'); draw();
      });
    };
    await draw();
  },

  async appearance(panel) {
    const cur = getThemePref();
    const opt = (k, t, d, e) => `<label class="cat-card" style="min-height:auto" aria-pressed="${cur === k}"><span class="row"><input type="radio" name="theme" value="${k}" ${cur === k ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px"><span style="font-size:1.3rem">${e}</span><strong>${t}</strong></span><span class="small muted">${d}</span></label>`;
    panel.innerHTML = `<div class="card" style="max-width:760px"><h2>Theme</h2><p class="small muted">Choose how WellnessApp looks on this device.</p>
      <div class="grid grid-3 mt">${opt('light', 'Light', 'Bright and clear', '☀️')}${opt('dark', 'Dark', 'Easier on the eyes at night', '🌙')}${opt('system', 'System', 'Match your device setting', '💻')}</div></div>`;
    panel.querySelectorAll('input[name=theme]').forEach((r) => r.addEventListener('change', () => {
      setThemePref(r.value);
      panel.querySelectorAll('label.cat-card').forEach((l) => l.setAttribute('aria-pressed', String(l.contains(r))));
      toast('Theme updated');
    }));
  },

  async privacy(panel, ctx) {
    panel.innerHTML = `<div class="grid grid-2">
      <div class="card"><h2>Export your data</h2><p class="small muted">Download all your records (profile, weight, steps, water, meals, sleep, workouts, chats). JSON includes everything; CSV is easy to open in Excel.</p>
        <div class="row"><button class="btn btn-secondary" id="exp">${icon('download')}Download JSON</button><button class="btn btn-secondary" id="expcsv">${icon('download')}Download CSV</button></div></div>
      <div class="card"><h2>Where your data lives</h2><p class="small muted">This local edition stores everything in <code>data/db.json</code> inside the app folder on your computer. Nothing is sent anywhere, except chat questions and a short profile summary (no email or full name) when the Claude AI key is enabled.</p></div>
      <div class="card span-2" style="border-color:#FECACA"><h2 style="color:var(--danger-text)">Delete account</h2>
        <p class="small">This permanently deletes your account and <strong>all</strong> associated data — profile, weight, steps, water, meals, sleep, workouts, reminders and AI conversations. This cannot be undone. Consider exporting your data first.</p>
        <form id="df" class="row" style="align-items:flex-end"><div class="field" style="flex:1;min-width:200px"><label for="dc">Type <strong>DELETE</strong> to confirm</label><input class="input" id="dc" autocomplete="off"></div><button class="btn btn-danger" id="dbtn">Delete my account</button></form></div></div>`;
    $('#exp').addEventListener('click', () => exportData('json'));
    $('#expcsv').addEventListener('click', () => exportData('csv'));
    $('#df').addEventListener('submit', async (e) => {
      e.preventDefault();
      if ($('#dc').value !== 'DELETE') { toast('Please type DELETE exactly to confirm', 'error'); return; }
      if (!(await confirmDialog('Your account and all data will be permanently deleted.', { okText: 'Delete everything' }))) return;
      await withBusy($('#dbtn'), async () => {
        try { await del('/users/me', { confirm: 'DELETE' }); await ctx.refreshMe(); toast('Your account has been deleted.'); ctx.navigate('/', { replace: true }); } catch (err) { toastError(err); }
      });
    });
  },
};
