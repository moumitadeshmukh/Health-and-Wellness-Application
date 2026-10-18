import { post } from '../api.js';
import { esc, icon, $, withBusy, wireDraft, clearDraft } from '../ui.js';

const DISCLAIMER = '<p class="disclaimer mt" style="text-align:center">WellnessApp offers general wellness information and is not a substitute for professional medical advice, diagnosis or treatment.</p>';

const pwField = (id, labelText, autocomplete) => `
  <div class="field">
    <label for="${id}">${labelText} <span class="req" aria-hidden="true">*</span></label>
    <div class="pw-wrap"><input class="input" id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required aria-describedby="${id}-err">
      <button type="button" class="icon-btn" data-toggle="${id}" aria-label="Show password">${icon('eye')}</button></div>
    <div class="field-error" id="${id}-err"></div>
  </div>`;

function wirePwToggles(root) {
  root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const inp = root.querySelector(`#${b.dataset.toggle}`);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    b.innerHTML = icon(show ? 'eyeOff' : 'eye');
  }));
}

function strength(pw) {
  if (pw.length < 8) return pw.length ? 1 : 0;
  let s = 2;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  else if (pw.length >= 12) s++;
  return Math.min(4, s);
}

export function render(ctx) {
  const { root, opts } = ctx;
  const mode = opts.mode;
  const wrap = (inner) => `<div class="auth-bg"><div class="auth-card"><a class="auth-brand" href="/"><img src="/icon.svg" alt="">WellnessApp</a><div class="card">${inner}</div></div></div>`;

  if (mode === 'register') {
    root.innerHTML = wrap(`
      <h1>Create your account</h1>
      <p class="muted">Start tracking your nutrition, habits and workouts.</p>
      <div id="server-err"></div>
      <form id="f" class="stack mt" novalidate>
        <div class="field"><label for="name">Full name <span class="req" aria-hidden="true">*</span></label><input class="input" id="name" autocomplete="name" required aria-describedby="name-err"><div class="field-error" id="name-err"></div></div>
        <div class="field"><label for="email">Email <span class="req" aria-hidden="true">*</span></label><input class="input" id="email" type="email" autocomplete="email" required aria-describedby="email-err"><div class="field-error" id="email-err"></div></div>
        ${pwField('password', 'Password', 'new-password')}
        <div class="strength" id="strength" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <div class="field-hint" id="strength-text">At least 8 characters.</div>
        ${pwField('confirm', 'Confirm password', 'new-password')}
        <div class="field-hint" id="match" style="color:var(--primary-dark)"></div>
        <button class="btn btn-primary btn-block" type="submit" id="submit">Create account</button>
      </form>
      <p class="small mt" style="text-align:center">Already have an account? <a href="/login">Sign in</a></p>
      ${DISCLAIMER}`);
    wirePwToggles(root);
    const v = {
      name: () => ($('#name').value.trim() ? '' : 'Please enter your full name.'),
      email: () => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('#email').value.trim()) ? '' : 'Please enter a valid email address.'),
      password: () => ($('#password').value.length >= 8 ? '' : 'Password must be at least 8 characters.'),
      confirm: () => ($('#confirm').value && $('#confirm').value === $('#password').value ? '' : 'Passwords do not match.'),
    };
    const check = (k) => { const msg = v[k](); $(`#${k}-err`).textContent = msg; $(`#${k}`).setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg; };
    Object.keys(v).forEach((k) => $(`#${k}`).addEventListener('blur', () => { if ($(`#${k}`).value) check(k); }));
    const upd = () => {
      const s = strength($('#password').value);
      $('#strength').className = `strength s${s}`;
      $('#strength-text').textContent = ['At least 8 characters.', 'Too short', 'Fair', 'Good', 'Strong'][s];
      const c = $('#confirm').value;
      $('#match').textContent = c && c === $('#password').value ? '✓ Passwords match' : '';
    };
    wireDraft($('#f'), 'register', ['name', 'email']);
    $('#password').addEventListener('input', upd);
    $('#confirm').addEventListener('input', upd);
    $('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('#server-err').innerHTML = '';
      const valid = Object.keys(v).map(check).every(Boolean);
      if (!valid) { root.querySelector('[aria-invalid="true"]')?.focus(); return; }
      await withBusy($('#submit'), async () => {
        try {
          await post('/auth/register', { name: $('#name').value.trim(), email: $('#email').value.trim(), password: $('#password').value });
          clearDraft('register');
          await ctx.refreshMe();
          ctx.navigate('/onboarding', { replace: true });
        } catch (err) {
          $('#server-err').innerHTML = `<div class="banner error mt">${icon('alert')}<div>${esc(err.message)}</div></div>`;
        }
      }, 'Creating account…');
    });
    return;
  }

  if (mode === 'forgot') {
    root.innerHTML = wrap(`
      <h1>Reset your password</h1>
      <div id="step1">
        <p class="muted">Enter your email. In this local version, the reset code is shown in the terminal window where the app is running.</p>
        <form id="f1" class="stack mt"><div class="field"><label for="email">Email</label><input class="input" id="email" type="email" required autocomplete="email"></div>
        <button class="btn btn-primary btn-block" id="b1">Get reset code</button></form>
      </div>
      <div id="step2" hidden>
        <div class="banner info mt">${icon('info')}<div>Look in the terminal/command window running WellnessApp for a line starting with <strong>[Password reset]</strong>.</div></div>
        <form id="f2" class="stack mt">
          <div class="field"><label for="token">Reset code</label><input class="input" id="token" required autocomplete="one-time-code"></div>
          ${pwField('password', 'New password', 'new-password')}
          <button class="btn btn-primary btn-block" id="b2">Update password</button>
        </form>
      </div>
      <div id="msg"></div>
      <p class="small mt" style="text-align:center"><a href="/login">Back to sign in</a></p>`);
    wirePwToggles(root);
    $('#f1').addEventListener('submit', async (e) => {
      e.preventDefault();
      await withBusy($('#b1'), async () => {
        try { await post('/auth/password-reset/request', { email: $('#email').value }); $('#step1').hidden = true; $('#step2').hidden = false; $('#token').focus(); }
        catch (err) { $('#msg').innerHTML = `<div class="banner error mt">${esc(err.message)}</div>`; }
      });
    });
    $('#f2').addEventListener('submit', async (e) => {
      e.preventDefault();
      await withBusy($('#b2'), async () => {
        try {
          await post('/auth/password-reset/confirm', { token: $('#token').value.trim(), password: $('#password').value });
          $('#msg').innerHTML = `<div class="banner success mt">${icon('check')}<div>Password updated. <a href="/login">Sign in now</a>.</div></div>`;
          $('#step2').hidden = true;
        } catch (err) { $('#msg').innerHTML = `<div class="banner error mt">${icon('alert')}<div>${esc(err.message)}</div></div>`; }
      });
    });
    return;
  }

  // login
  root.innerHTML = wrap(`
    <h1>Welcome back</h1>
    <p class="muted">Sign in to continue your wellness journey.</p>
    <div id="server-err"></div>
    <form id="f" class="stack mt" novalidate>
      <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
      ${pwField('password', 'Password', 'current-password')}
      <div class="row between small"><span></span><a href="/forgot">Forgot password?</a></div>
      <button class="btn btn-primary btn-block" type="submit" id="submit">Sign in</button>
    </form>
    <p class="small mt" style="text-align:center">New here? <a href="/register">Create an account</a></p>
    ${DISCLAIMER}`);
  wirePwToggles(root);
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#server-err').innerHTML = '';
    if (!$('#email').value || !$('#password').value) { $('#server-err').innerHTML = `<div class="banner error mt">${icon('alert')}<div>Please enter your email and password.</div></div>`; return; }
    await withBusy($('#submit'), async () => {
      try {
        const me = await post('/auth/login', { email: $('#email').value.trim(), password: $('#password').value });
        await ctx.refreshMe();
        try { sessionStorage.setItem('wa-tiara-greet', '1'); } catch { /* ignore */ }
        ctx.navigate(me.onboarded ? '/dashboard' : '/onboarding', { replace: true });
      } catch (err) {
        $('#server-err').innerHTML = `<div class="banner error mt">${icon('alert')}<div>${esc(err.message)}</div></div>`;
      }
    }, 'Signing in…');
  });
}
