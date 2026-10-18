// 14-Day Fit Glow Challenge section (shown inside the Workouts page): day-by-day follow-along workouts with progress and streak.
import { getFull, get, post } from '../api.js';
import { esc, icon, skeleton, errorBox, toast, toastError, confirmDialog, ring } from '../ui.js';

const LEVELS = [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']];
const TAG_COLOR = { HIIT: 'hiit', Abs: 'abs', 'Lower body': 'legs', 'Upper body': 'arms', Cardio: 'cardio', Recovery: 'recovery', Strength: 'strength' };
const load = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export async function mountChallenge(root, { me }) {
  let level = load('wa-ch-level', me?.profile?.exercise_intensity || 'beginner');
  let lowImpact = load('wa-ch-li', '0') === '1';

  const draw = async () => {
    root.innerHTML = skeleton(3);
    let plan; let progress = null;
    try {
      plan = (await getFull('/challenge', { level, low_impact: String(lowImpact) })).data;
      if (me) progress = await get('/challenge/progress');
    } catch (e) { root.innerHTML = errorBox(e); root.querySelector('[data-retry]')?.addEventListener('click', draw); return; }
    const done = new Set(progress?.completed_days || []);
    const next = progress?.next_day || 1;
    const pct = Math.round(((progress?.completed_count || 0) / plan.days.length) * 100);
    const today = plan.days.find((d) => d.day === next);

    root.innerHTML = `
      <section class="ch-hero" id="challenge">
        <div class="ch-hero-text">
          <div class="ch-badge">${esc(plan.emoji)} 2-week challenge</div>
          <h2 class="ch-title">${esc(plan.title)}</h2>
          <p>${esc(plan.blurb)}</p>
          <div class="chips mt-s">${LEVELS.map(([k, l]) => `<button class="chip ch-chip" data-lv="${k}" aria-pressed="${k === level}">${l}</button>`).join('')}
            <button class="chip ch-chip" id="ch-li" aria-pressed="${lowImpact}">🦶 No-jump version</button></div>
          ${today && !progress?.finished ? `<a class="btn btn-lg ch-start" href="/workouts/${today.id}">${icon('play')}${done.size ? `Continue · Day ${today.day}` : 'Start Day 1'}</a>` : ''}
        </div>
        <div class="ch-hero-stats">
          ${me ? `<div class="ch-ring">${ring(pct, { size: 132, stroke: 12, color: '#fff', labelHtml: `<strong style="font-size:1.6rem">${progress.completed_count}/${plan.days.length}</strong><span class="tiny">days done</span>` })}</div>
            <div class="ch-streak">🔥 <strong>${progress.streak}</strong>-day streak</div>`
            : '<div class="ch-signin"><strong>Track your progress</strong><p class="small">Sign in to tick off days and build a streak.</p><a class="btn btn-secondary btn-sm" href="/register">Create free account</a></div>'}
        </div>
      </section>
      ${progress?.finished ? `<div class="banner success mt">${icon('check')}<div><strong>Challenge complete! 🏆</strong> You finished all 14 days — amazing consistency. Try the next level up or restart for another round.</div></div>` : ''}
      <div class="ch-grid mt">
        ${plan.days.map((d) => {
          const isDone = done.has(d.day); const isNext = d.day === next && !progress?.finished;
          return `<a class="ch-day ${isDone ? 'done' : ''} ${isNext ? 'next' : ''} tag-${TAG_COLOR[d.tag] || 'hiit'}" href="/workouts/${d.id}">
            <div class="row between"><span class="ch-num">Day ${d.day}</span>${isDone ? '<span class="ch-tick" aria-label="Completed">✓</span>' : isNext ? '<span class="ch-today">Today</span>' : ''}</div>
            <div class="ch-emoji" aria-hidden="true">${d.emoji}</div>
            <strong>${esc(d.title)}</strong>
            <span class="tiny muted">${d.duration_min} min · ${esc(d.tag)} · ${d.exercise_count} moves × ${d.rounds}</span>
            <span class="tiny ch-preview">${d.preview.map(esc).join(' · ')}</span>
          </a>`;
        }).join('')}
      </div>
      <details class="card mt ch-tips">
        <summary><strong>How the challenge works</strong></summary>
        <ul class="small">
          <li>Do one workout a day. Each one is short (12–20 min) and plays hands-free: warm-up, timed exercises with short rests, then a cool-down.</li>
          <li>Turn on <strong>🗣 Voice coach</strong> and <strong>🎵 Workout beat</strong> in the player for a follow-along feel. Use <strong>⛶</strong> for full screen.</li>
          <li>Missed a day? Just carry on with the next one — consistency beats perfection.</li>
          <li>Choose the <strong>No-jump version</strong> if you need to protect your knees or pelvic floor, or you live upstairs.</li>
        </ul>
        ${me && done.size ? '<button class="btn btn-ghost btn-sm" id="ch-restart">↺ Restart challenge</button>' : ''}
        <p class="disclaimer">Exercise can't burn fat from one specific area. If you're pregnant, recently gave birth, or have a medical condition or injury, check with a healthcare professional first. Stop if you feel pain, dizziness or chest discomfort.</p>
      </details>`;

    root.querySelectorAll('[data-lv]').forEach((b) => b.addEventListener('click', () => { level = b.dataset.lv; save('wa-ch-level', level); draw(); }));
    root.querySelector('#ch-li').addEventListener('click', () => { lowImpact = !lowImpact; save('wa-ch-li', lowImpact ? '1' : '0'); draw(); });
    root.querySelector('#ch-restart')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Restart the 14-day challenge? Your workout history is kept — only the challenge tick marks reset.', { okText: 'Restart', danger: false }))) return;
      try { await post('/challenge/restart'); toast('Challenge restarted — Day 1, here we go! 💪'); draw(); } catch (e) { toastError(e); }
    });
  };
  await draw();
}
