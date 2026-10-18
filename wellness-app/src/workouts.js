// Ready-made workouts: themed, multi-exercise sessions at 20 / 30 / 45 minutes for each level.
// Built deterministically from the exercise library so the same workout always has the same exercises.
import { generateWorkoutPlan } from './logic.js';
import { EXERCISE_BY_ID } from './data/exercises.js';

export const THEMES = [
  { id: 'full-body', title: 'Full Body Burn', emoji: '🔥', goal: 'weight_loss', categories: ['full_body', 'hip_lower_body', 'core', 'chest_toning'], blurb: 'A balanced session working legs, core and upper body.' },
  { id: 'core', title: 'Core Strength', emoji: '🎯', categories: ['core'], blurb: 'Planks, crunches and stability work for a strong middle.' },
  { id: 'lower-body', title: 'Lower Body & Glutes', emoji: '🦵', categories: ['hip_lower_body'], blurb: 'Squats, lunges, bridges and hip work.' },
  { id: 'upper-body', title: 'Upper Body & Posture', emoji: '💪', categories: ['chest_toning', 'posture'], blurb: 'Push-ups, presses and back work for strong shoulders and better posture.' },
  { id: 'cardio', title: 'Cardio & Stamina', emoji: '🏃', categories: ['stamina', 'full_body'], blurb: 'Get your heart rate up with walking, marching and circuits.' },
  { id: 'low-impact', title: 'Low-Impact Fat Burn', emoji: '🚶', low_impact: true, categories: ['low_impact', 'stamina', 'hip_lower_body'], blurb: 'Joint-friendly moves with no jumping.' },
  { id: 'yoga-stretch', title: 'Yoga & Stretch', emoji: '🧘', categories: ['yoga', 'stretching', 'mobility'], blurb: 'Calm, flexible and relaxed — great for evenings.' },
  { id: 'mobility', title: 'Mobility & Desk Relief', emoji: '🔄', categories: ['mobility', 'posture', 'stretching'], blurb: 'Loosen stiff hips, back and shoulders.' },
  { id: 'diastasis-recti', title: 'Diastasis Recti Recovery', emoji: '🫶', categories: ['diastasis_recti'], durations: [20, 30], blurb: 'Gentle deep-core rebuilding with breathing — often used after pregnancy. Get medical clearance first.' },
  { id: 'recovery', title: 'Rest-Day Recovery', emoji: '🛌', categories: ['recovery', 'stretching'], durations: [20, 30], blurb: 'Light movement, breathing and relaxation.' },
];
export const DURATIONS = [20, 30, 45];
export const LEVELS = ['beginner', 'intermediate', 'advanced'];

const cache = new Map();

export function readyWorkout(id) {
  if (cache.has(id)) return cache.get(id);
  const m = id.match(/^([a-z-]+)-(20|30|45)-(beginner|intermediate|advanced)$/);
  if (!m) return null;
  const theme = THEMES.find((t) => t.id === m[1]);
  const duration = Number(m[2]);
  const level = m[3];
  if (!theme || !(theme.durations || DURATIONS).includes(duration)) return null;
  const plan = generateWorkoutPlan({
    seed: id, userId: null, goal: theme.goal || 'general_wellness', level, duration, equipment: [],
    lowImpact: Boolean(theme.low_impact), categories: theme.categories, title: `${theme.title} · ${duration} min`,
  });
  const workout = {
    id, theme: theme.id, title: theme.title, emoji: theme.emoji, blurb: theme.blurb, duration_min: duration, level,
    rounds: plan.rounds || 1, notes: [...new Set(plan.notes)], est_total_minutes: plan.est_total_minutes,
    exercises: plan.exercises.map((x) => {
      const e = EXERCISE_BY_ID[x.exercise_id];
      return { ...x, category: e.category, impact: e.impact, target_muscles: e.target_muscles, equipment: e.equipment, safety_notes: e.safety_notes, instructions: e.instructions };
    }),
  };
  cache.set(id, workout);
  return workout;
}

export function readyWorkoutList(level = 'beginner') {
  const out = [];
  for (const t of THEMES) {
    for (const d of t.durations || DURATIONS) {
      const w = readyWorkout(`${t.id}-${d}-${level}`);
      if (!w) continue;
      out.push({
        id: w.id, theme: w.theme, title: w.title, emoji: w.emoji, blurb: w.blurb, duration_min: d, level,
        exercise_count: w.exercises.length, main_count: w.exercises.filter((x) => x.phase === 'main').length,
        est_total_minutes: w.est_total_minutes, rounds: w.rounds,
        preview: w.exercises.filter((x) => x.phase === 'main').slice(0, 4).map((x) => x.name),
      });
    }
  }
  return out;
}
