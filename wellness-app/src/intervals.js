// Timed interval workouts (30–45 min): every exercise runs for a set time (e.g. 30 s) followed by a short rest
// (e.g. 15 s), one after another, in rounds — warm-up and cool-down included.
// Built deterministically from the exercise library, so the same id always gives the same workout.
import { EXERCISES, DR_SAFETY, DR_PROGRAM, KEGEL_SAFETY, SPOT_REDUCTION_DISCLAIMER } from './data/exercises.js';

export const INTERVAL_THEMES = [
  { id: 'full-body-hiit', title: 'Full Body HIIT', emoji: '🔥', categories: ['full_body', 'stamina', 'hip_lower_body', 'core', 'chest_toning'], blurb: 'Fast-paced circuit for the whole body — great for burning calories.' },
  { id: 'cardio-burn', title: 'Cardio Fat Burn', emoji: '🏃', categories: ['stamina', 'full_body', 'low_impact'], blurb: 'Keep your heart rate up with marching, steps and full-body moves.' },
  { id: 'core-abs', title: 'Core & Abs', emoji: '🎯', categories: ['core'], extra: ['full_body'], blurb: 'Planks, crunches and stability work for a strong middle.' },
  { id: 'legs-glutes', title: 'Legs & Glutes', emoji: '🦵', categories: ['hip_lower_body'], extra: ['full_body'], blurb: 'Squats, lunges and bridges to tone legs and hips.' },
  { id: 'upper-body', title: 'Arms, Chest & Posture', emoji: '💪', categories: ['chest_toning', 'posture'], blurb: 'Push-ups, presses and back work for strong shoulders.' },
  { id: 'strength-tone', title: 'Strength & Tone', emoji: '🏋️', categories: ['chest_toning', 'hip_lower_body', 'core', 'posture'], blurb: 'Controlled strength moves for every major muscle group.' },
  { id: 'low-impact', title: 'Low-Impact Sweat', emoji: '🚶', low_impact: true, categories: ['low_impact', 'stamina', 'hip_lower_body', 'core'], blurb: 'No jumping — kind to knees and joints, still gets you moving.' },
  { id: 'yoga-flow', title: 'Yoga Flow', emoji: '🧘', calm: true, categories: ['yoga', 'stretching'], extra: ['mobility'], blurb: 'Hold each pose, breathe, and move slowly between them.' },
  { id: 'stretch-mobility', title: 'Stretch & Mobility', emoji: '🔄', calm: true, categories: ['mobility', 'stretching', 'posture'], blurb: 'Loosen stiff hips, back and shoulders.' },
  { id: 'postnatal-core', title: 'Postnatal Core (Diastasis Recti)', emoji: '🫶', gentle: true, categories: ['diastasis_recti', 'kegel_pelvic'], durations: [30], blurb: 'Gentle deep-core and pelvic floor work. Get medical clearance first.' },
];
export const INTERVAL_DURATIONS = [30, 35, 40, 45];
export const INTERVAL_FORMATS = {
  mixed: { label: 'Mixed timing', hint: 'Each exercise gets the time that suits it: 30 s cardio, 45 s strength, 60 s stretches' },
  '30-15': { label: '30 s work · 15 s rest', work: 30, rest: 15 },
  '40-20': { label: '40 s work · 20 s rest', work: 40, rest: 20 },
  '45-15': { label: '45 s work · 15 s rest', work: 45, rest: 15 },
  '60-30': { label: '60 s work · 30 s rest', work: 60, rest: 30 },
};
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };
const WARM_SECS = 40; const COOL_SECS = 40; const TRANSITION = 10;

function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (arr, rand) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Upbeat follow-along moves get priority in energetic workouts; slow "walking" cardio is left for low-impact days.
const FUN = new Set(['butt-kicks', 'squat-jumps', 'star-jumps', 'plank-jacks', 'plank-shoulder-taps', 'in-and-outs', 'flutter-kicks', 'side-to-side-hops', 'toe-touch-crunch', 'up-down-plank', 'standing-oblique-crunch', 'step-jacks', 'jumping-lunges', 'squat-pulses', 'fast-feet',
  'jumping-jack', 'mountain-climber', 'burpee', 'high-knees', 'skater-steps', 'squat-step-back', 'bicycle-crunch', 'russian-twist', 'shadow-boxing', 'dance-cardio', 'heel-taps', 'sumo-squat', 'reverse-lunge', 'standing-knee-elbow', 'squat-to-press', 'plank', 'glute-bridge', 'bodyweight-squat']);
const DULL = new Set(['brisk-walk', 'interval-walk', 'cycling', 'stair-climbing', 'beginner-jog', 'low-impact-aerobics']);
const homeFriendly = (e) => e.equipment.every((q) => q === 'none' || q === 'mat') && !/-circuit$/.test(e.id);

/** Work/rest seconds for one exercise in the chosen format. */
function timing(e, format, theme, level) {
  const f = INTERVAL_FORMATS[format];
  if (f.work) return { work: f.work, rest: f.rest };
  let work;
  if (['yoga', 'stretching', 'mobility', 'recovery'].includes(e.category)) work = 60;
  else if (['diastasis_recti', 'kegel_pelvic'].includes(e.category)) work = 40; // gentle rehab: 40 s work / 20 s rest
  else if (['stamina', 'low_impact'].includes(e.category) || (e.category === 'full_body' && e.impact === 'high')) work = 30;
  else if (e.duration_min) work = 40; // holds such as planks
  else work = 45; // strength moves
  const rest = theme.calm ? 10 : theme.gentle ? 20 : level === 'beginner' ? 20 : 15;
  return { work, rest };
}

const cache = new Map();
export const intervalId = (theme, duration, format, level) => `iv-${theme}-${duration}-${format}-${level}`;

export function intervalWorkout(id) {
  if (cache.has(id)) return cache.get(id);
  const m = String(id).match(/^iv-([a-z-]+?)-(\d{2})-(mixed|\d{2}-\d{2})-(beginner|intermediate|advanced)$/);
  if (!m) return null;
  const theme = INTERVAL_THEMES.find((t) => t.id === m[1]);
  const duration = Number(m[2]); const format = m[3]; const level = m[4];
  if (!theme || !(theme.durations || INTERVAL_DURATIONS).includes(duration) || !INTERVAL_FORMATS[format]) return null;
  const w = buildInterval({ id, theme, duration, format, level });
  cache.set(id, w);
  return w;
}

/** Build a timed workout from a theme. Used by the planner (30–45 min) and the 14-day challenge (12–20 min). */
export function buildInterval({ id, theme, duration, format, level, seed = id }) {
  const rand = rng(seed);
  const short = duration < 25;
  const WARM_SECS = short ? 30 : 40; const COOL_SECS = short ? 30 : 40;
  const fits = (e) => homeFriendly(e) && LEVEL_RANK[e.difficulty] <= LEVEL_RANK[level] && (!theme.low_impact || e.impact !== 'high');

  // Main pool: theme categories first, then extras, then relax the level if still short.
  const energetic = !theme.calm && !theme.gentle;
  const fun = (list) => (energetic ? list.filter((e) => theme.low_impact || !DULL.has(e.id)).sort((a, b) => FUN.has(b.id) - FUN.has(a.id)) : list);
  let pool = fun(shuffle(EXERCISES.filter((e) => theme.categories.includes(e.category) && fits(e)), rand));
  if (pool.length < 8 && theme.extra) pool = [...pool, ...shuffle(EXERCISES.filter((e) => theme.extra.includes(e.category) && fits(e)), rand)];
  if (pool.length < 6) pool = [...pool, ...shuffle(EXERCISES.filter((e) => theme.categories.includes(e.category) && homeFriendly(e) && !pool.includes(e) && (!theme.low_impact || e.impact !== 'high')), rand)];
  // Interleave categories so the circuit alternates muscle groups.
  const byCat = theme.categories.map((c) => pool.filter((e) => e.category === c)).concat([pool.filter((e) => !theme.categories.includes(e.category))]);
  const mixed = [];
  while (byCat.some((l) => l.length)) for (const l of byCat) if (l.length) mixed.push(l.shift());
  if (theme.gentle) {
    // Rehab order, building from breath to load (mirrors common diastasis recti programmes).
    const ORDER = ['dr-360-breathing', 'kegel-identify', 'dr-tva-activation', 'dr-pelvic-tilt', 'dr-heel-slide', 'dr-heel-slide-leg-lift', 'dr-toe-taps', 'dr-dead-bug', 'dr-bridge', 'dr-modified-plank', 'kegel-bridge', 'dr-quadruped-hold', 'kegel-slow', 'dr-side-lying-leg', 'kegel-elevator', 'kegel-quick', 'dr-pillow-squeeze', 'dr-wall-press', 'pelvic-relax-breath'];
    const rank = (e) => { const i = ORDER.indexOf(e.id); return i === -1 ? 99 : i; };
    mixed.sort((a, b) => rank(a) - rank(b));
  }

  const warmCount = short ? 3 : theme.calm || theme.gentle ? 3 : 5;
  const warm = shuffle(EXERCISES.filter((e) => e.category === 'warmup' && homeFriendly(e) && (!theme.low_impact && !theme.gentle ? true : e.impact !== 'high')), rand).slice(0, warmCount);
  const cool = shuffle(EXERCISES.filter((e) => ['cooldown', 'stretching'].includes(e.category) && homeFriendly(e) && !mixed.slice(0, 12).includes(e)), rand).slice(0, short ? 3 : 5);
  const warmTime = warm.length * (WARM_SECS + TRANSITION);
  const coolTime = cool.length * (COOL_SECS + TRANSITION) + 15;
  const mainTime = duration * 60 - warmTime - coolTime;

  // Choose rounds and exercises per round so the main block fills the time.
  const slot = (e) => { const t = timing(e, format, theme, level); return t.work + t.rest; };
  // Try every rounds × exercise-count combination and keep the one closest to the target time
  // (round breaks of 30–90 s absorb the remainder). Prefer 3–4 rounds and more variety.
  const maxCount = Math.min(14, mixed.length);
  const prefRounds = short || theme.calm || theme.gentle ? 2 : duration >= 40 ? 4 : 3;
  let best = null;
  for (let r = 2; r <= 8; r++) {
    for (let c = Math.min(4, maxCount); c <= maxCount; c++) {
      const rt = mixed.slice(0, c).reduce((t, e) => t + slot(e), 0);
      const rr = Math.max(short ? 20 : 30, Math.min(short ? 60 : 90, Math.round((mainTime - rt * r) / (r - 1) / 5) * 5));
      const err = Math.abs(mainTime - (rt * r + rr * (r - 1)));
      const score = err + Math.abs(r - prefRounds) * 25 - c * (short ? 12 : 4);
      if (!best || score < best.score) best = { r, c, rr, score };
    }
  }
  const rounds = best.r;
  const main = mixed.slice(0, best.c);
  const roundTime = main.reduce((t, e) => t + slot(e), 0);
  const roundRest = best.rr;

  const row = (e, phase, i, t) => ({
    exercise_id: e.id, name: e.name, phase, order: i, sets: 1, reps: e.reps || null, duration_min: null,
    work_seconds: t.work, rest_seconds: t.rest, category: e.category, impact: e.impact,
    target_muscles: e.target_muscles, equipment: e.equipment, safety_notes: e.safety_notes, instructions: e.instructions,
  });
  const exercises = [
    ...warm.map((e, i) => row(e, 'warmup', i, { work: WARM_SECS, rest: TRANSITION })),
    ...main.map((e, i) => row(e, 'main', warm.length + i, timing(e, format, theme, level))),
    ...cool.map((e, i) => row(e, 'cooldown', warm.length + main.length + i, { work: COOL_SECS, rest: TRANSITION })),
  ];
  const totalSecs = warmTime + roundTime * rounds + roundRest * (rounds - 1) + coolTime;
  const notes = [
    `Each exercise runs on a timer — do as many good-form reps as you can, then rest until the next one starts.${roundRest ? ` ${roundRest} s break between rounds.` : ''}`,
    theme.gentle ? DR_SAFETY : null,
    theme.gentle ? DR_PROGRAM : null,
    theme.categories.includes('kegel_pelvic') ? KEGEL_SAFETY : null,
    !theme.calm && !theme.gentle ? SPOT_REDUCTION_DISCLAIMER : null,
  ].filter(Boolean);
  const works = [...new Set(main.map((e) => timing(e, format, theme, level).work))].sort((a, b) => a - b);
  const w = {
    id, interval: true, theme: theme.id, title: theme.title, emoji: theme.emoji, blurb: theme.blurb, duration_min: duration, level,
    format, format_label: INTERVAL_FORMATS[format].label, rounds, round_rest: roundRest, exercises, notes,
    est_total_minutes: Math.round(totalSecs / 60), work_range: works.length > 1 ? `${works[0]}–${works[works.length - 1]} s` : `${works[0]} s`,
  };
  return w;
}

export function intervalOptions() {
  return {
    themes: INTERVAL_THEMES.map((t) => ({ id: t.id, title: t.title, emoji: t.emoji, blurb: t.blurb, durations: t.durations || INTERVAL_DURATIONS })),
    durations: INTERVAL_DURATIONS,
    formats: Object.entries(INTERVAL_FORMATS).map(([id, f]) => ({ id, label: f.label, hint: f.hint || '' })),
  };
}
