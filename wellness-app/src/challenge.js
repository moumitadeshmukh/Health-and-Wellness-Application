// 14-Day Fit Glow Challenge: one short, energetic follow-along workout a day (12–20 min),
// mixing HIIT, abs, legs, arms and active recovery. Built on the timed-interval engine.
import { INTERVAL_THEMES, buildInterval } from './intervals.js';

const T = (id) => INTERVAL_THEMES.find((t) => t.id === id);
const LOW_IMPACT_ALT = { 'full-body-hiit': 'low-impact', 'cardio-burn': 'low-impact' };

export const CHALLENGE = {
  id: 'fit-glow-14',
  title: '14-Day Fit Glow Challenge',
  emoji: '🌟',
  blurb: 'One short, fun follow-along workout a day for two weeks — HIIT, abs, legs, arms and stretch days. 12–20 minutes, no equipment.',
};

// type → interval theme, timing format and a fun day title
export const DAYS = [
  { day: 1, title: 'Kick-Off HIIT', type: 'full-body-hiit', format: '30-15', min: 15, tag: 'HIIT' },
  { day: 2, title: 'Ab Blast', type: 'core-abs', format: '30-15', min: 12, tag: 'Abs' },
  { day: 3, title: 'Booty & Legs Burn', type: 'legs-glutes', format: '40-20', min: 15, tag: 'Lower body' },
  { day: 4, title: 'Toned Arms & Posture', type: 'upper-body', format: '40-20', min: 12, tag: 'Upper body' },
  { day: 5, title: 'Sweat Session Cardio', type: 'cardio-burn', format: '30-15', min: 15, tag: 'Cardio' },
  { day: 6, title: 'Core on Fire', type: 'core-abs', format: '40-20', min: 13, tag: 'Abs' },
  { day: 7, title: 'Stretch & Recharge', type: 'stretch-mobility', format: 'mixed', min: 15, tag: 'Recovery' },
  { day: 8, title: 'Full Body Shred', type: 'full-body-hiit', format: '40-20', min: 15, tag: 'HIIT' },
  { day: 9, title: 'Abs & Obliques', type: 'core-abs', format: '45-15', min: 15, tag: 'Abs' },
  { day: 10, title: 'Leg Day Power', type: 'legs-glutes', format: '45-15', min: 15, tag: 'Lower body' },
  { day: 11, title: 'Cardio Party', type: 'cardio-burn', format: '40-20', min: 20, tag: 'Cardio' },
  { day: 12, title: 'Strength & Tone', type: 'strength-tone', format: '45-15', min: 15, tag: 'Strength' },
  { day: 13, title: 'Final Push HIIT', type: 'full-body-hiit', format: '45-15', min: 20, tag: 'HIIT' },
  { day: 14, title: 'Celebration Yoga Flow', type: 'yoga-flow', format: 'mixed', min: 15, tag: 'Recovery' },
];
const DAY_EMOJI = { HIIT: '🔥', Abs: '🎯', 'Lower body': '🍑', 'Upper body': '💪', Cardio: '🏃', Recovery: '🧘', Strength: '🏋️' };

export const challengeId = (day, level, lowImpact) => `ch-${day}-${level}${lowImpact ? '-li' : ''}`;

const cache = new Map();
export function challengeWorkout(id) {
  if (cache.has(id)) return cache.get(id);
  const m = String(id).match(/^ch-(\d{1,2})-(beginner|intermediate|advanced)(-li)?$/);
  if (!m) return null;
  const d = DAYS.find((x) => x.day === Number(m[1]));
  if (!d) return null;
  const level = m[2]; const lowImpact = Boolean(m[3]);
  const themeId = lowImpact ? LOW_IMPACT_ALT[d.type] || d.type : d.type;
  const theme = { ...T(themeId), low_impact: lowImpact || T(themeId).low_impact };
  const w = buildInterval({ id, theme, duration: d.min, format: d.format, level, seed: `${CHALLENGE.id}-${d.day}-${level}-${lowImpact}` });
  Object.assign(w, {
    title: `Day ${d.day} · ${d.title}`, emoji: DAY_EMOJI[d.tag] || '🌟', blurb: `${CHALLENGE.title} — ${d.tag}${lowImpact ? ' (no jumping)' : ''}.`,
    challenge: { id: CHALLENGE.id, day: d.day, total: DAYS.length, tag: d.tag, low_impact: lowImpact },
  });
  cache.set(id, w);
  return w;
}

export function challengePlan(level = 'beginner', lowImpact = false) {
  return {
    ...CHALLENGE, level, low_impact: lowImpact,
    days: DAYS.map((d) => {
      const w = challengeWorkout(challengeId(d.day, level, lowImpact));
      return {
        day: d.day, title: d.title, tag: d.tag, emoji: DAY_EMOJI[d.tag] || '🌟', duration_min: d.min, id: w.id,
        exercise_count: w.exercises.filter((x) => x.phase === 'main').length, rounds: w.rounds, format_label: w.format_label,
        preview: w.exercises.filter((x) => x.phase === 'main').slice(0, 3).map((x) => x.name),
      };
    }),
  };
}

/** Progress from the user's saved workout sessions (completed challenge workouts since the last restart). */
export function challengeProgress(sessions, since) {
  const done = new Map();
  for (const s of sessions) {
    if (!s.challenge_day || s.stopped_early || (since && s.completed_at < since)) continue;
    if (!done.has(s.challenge_day)) done.set(s.challenge_day, s.date);
  }
  const completed = [...done.keys()].sort((a, b) => a - b);
  const next = DAYS.find((d) => !done.has(d.day))?.day || null;
  // streak = consecutive calendar days (ending today or yesterday) with a challenge workout
  const dates = new Set(sessions.filter((s) => s.challenge_day && !s.stopped_early && (!since || s.completed_at >= since)).map((s) => s.date));
  let streak = 0;
  const d = new Date();
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (!dates.has(iso(d))) d.setDate(d.getDate() - 1);
  while (dates.has(iso(d))) { streak++; d.setDate(d.getDate() - 1); }
  return { completed_days: completed, completed_count: completed.length, total: DAYS.length, next_day: next, streak, finished: completed.length === DAYS.length, done_dates: Object.fromEntries(done) };
}
