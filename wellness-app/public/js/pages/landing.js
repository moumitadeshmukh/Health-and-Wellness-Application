import { icon } from '../ui.js';
import { mountBmiCalculator } from '../bmi-calc.js';

export function render({ root }) {
  const f = (ic, cls, t, d) => `<div class="card"><div class="icon-badge ${cls}">${icon(ic)}</div><h3 class="mt-s">${t}</h3><p class="muted small">${d}</p></div>`;
  const step = (n, t, d) => `<div class="card"><div class="icon-badge ib-green" style="font-weight:700">${n}</div><h3 class="mt-s">${t}</h3><p class="muted small">${d}</p></div>`;
  root.innerHTML = `
  <div class="landing">
    <nav>
      <a class="brand" href="/" style="padding:0"><img src="/icon.svg" alt="">WellnessApp</a>
      <div class="row"><a class="btn btn-ghost" href="/workouts">Workouts</a><a class="btn btn-ghost" href="/exercises">Exercises</a><a class="btn btn-ghost" href="/login">Sign in</a><a class="btn btn-primary" href="/register">Get started free</a></div>
    </nav>
    <section class="hero">
      <div>
        <span class="tag">Your personal health companion</span>
        <h1 class="mt">One app for your entire health & wellness journey</h1>
        <p class="lead">Track nutrition, monitor weight, discover recipes from what's in your kitchen, follow workout plans, and chat with an AI wellness coach — all in one place.</p>
        <div class="row mt"><a class="btn btn-primary" href="/register">Start for free →</a><a class="btn btn-secondary" href="/workouts">Try a free workout</a></div>
        <div class="row mt" style="gap:28px">
          <div><div class="stat">10+</div><div class="small muted">Health modules</div></div>
          <div><div class="stat">100+</div><div class="small muted">Animated exercises</div></div>
          <div><div class="stat">90+</div><div class="small muted">Healthy recipes</div></div>
        </div>
        <p class="disclaimer mt">⚠️ WellnessApp provides general wellness information only and is not a substitute for professional medical advice.</p>
      </div>
      <div class="hero-art" id="bmi-check">
        <div class="row between"><h2 style="margin:0">Is my BMI healthy?</h2><span class="tag">Free · no sign-up</span></div>
        <p class="small muted mt-s">Enter your height and weight to see your BMI, whether it's in the healthy range, and the healthy weight range for your height.</p>
        <div id="bmi-widget" class="mt-s"></div>
        <div id="bmi-cta"></div>
      </div>
    </section>
    <section class="features">
      <h2 style="text-align:center">Everything you need, in one place</h2>
      <p class="muted" style="text-align:center">No more juggling multiple apps.</p>
      <div class="grid grid-3 mt">
        ${f('scale', 'ib-amber', 'BMI & Weight', 'Calculate BMI, set realistic goals and track your weight with interactive charts.')}
        ${f('chef', 'ib-green', 'Smart Recipes', 'Enter the ingredients you have and get Indian and international recipes ranked by what you can cook right now.')}
        <a class="card" href="/exercises"><div class="icon-badge ib-violet">${icon('dumbbell')}</div><h3 class="mt-s">Exercise Library →</h3><p class="muted small">Categorised exercises with step-by-step instructions, modifications and safety guidance. Free to browse.</p></a>
        ${f('activity', 'ib-blue', 'Daily Tracker', 'Log steps, water, meals, sleep and last-meal time — all your habits in one place.')}
        ${f('chart', 'ib-green', 'Progress Reports', 'Weight trends, habit streaks, milestones and weekly summaries.')}
        ${f('chat', 'ib-blue', 'Tiara, your chat assistant', 'Chat with Tiara for meal ideas, workout plans and practical tips.')}
      </div>
      <h2 class="mt" style="text-align:center;margin-top:48px">How it works</h2>
      <div class="grid grid-3 mt">
        ${step(1, 'Create your free account', 'Sign up with your email — it takes under a minute.')}
        ${step(2, 'Set up your profile', 'Tell us your height, weight, goals, food preferences and schedule.')}
        ${step(3, 'Track, cook and move', 'Log your day, find recipes, follow workouts and watch your progress grow.')}
      </div>
      <div class="card mt" style="text-align:center;margin-top:40px;background:var(--primary-softer);border-color:#BBF7D0">
        <h2>Start your wellness journey today</h2>
        <p class="muted">Free to use. No credit card required. Your data stays on your computer.</p>
        <a class="btn btn-primary" href="/register">Create free account →</a>
      </div>
    </section>
  </div>`;
  mountBmiCalculator(root.querySelector('#bmi-widget'), {
    onResult: () => {
      root.querySelector('#bmi-cta').innerHTML = `<div class="banner info mt">${icon('info')}<div>Want to track your weight over time and set a healthy goal? <a href="/register">Create a free account</a> to save your results.</div></div>`;
    },
  });
}
