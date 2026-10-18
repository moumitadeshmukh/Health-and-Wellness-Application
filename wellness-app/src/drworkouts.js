// Follow-along diastasis recti (ab separation) workouts: fixed sequences, each move timed (work → short transition).
// The standard routine follows a popular 12-minute postpartum format: 12 moves × 45 s, both sides for side work.
import { EXERCISE_BY_ID, DR_SAFETY, DR_PROGRAM, KEGEL_SAFETY } from './data/exercises.js';

const PROGRAMS = {
  'drw-12': {
    group: 'dr', minutes: 12, title: 'Diastasis Recti · 12-Min Ab Rehab', emoji: '🫶', level: 'intermediate', work: 45, rest: 10,
    blurb: 'Rebuild your deep core (transverse abdominis) and obliques — 12 guided moves, 45 seconds each. Aim for twice a week.',
    moves: [
      ['dr-single-leg-march'], ['dr-bridge'], ['dr-toe-taps'], ['dr-dead-bug'],
      ['dr-side-lying-leg', 'Right side'], ['dr-side-lying-leg', 'Left side'],
      ['dr-side-plank-hold', 'Left side'], ['dr-side-plank-hold', 'Right side'],
      ['dr-tabletop-breathing'], ['dr-bird-dog'],
      ['dr-side-plank-dips', 'Right side'], ['dr-side-plank-dips', 'Left side'],
    ],
  },
  'drw-12-gentle': {
    group: 'dr', minutes: 12, title: 'Diastasis Recti · Gentle 12-Min Rehab', emoji: '🌷', level: 'beginner', work: 40, rest: 15,
    blurb: 'The lighter version for early recovery (after your 6–8 week check, or 8–10 weeks after a C-section). Slower moves, longer rests, no planks.',
    moves: [
      ['dr-360-breathing'], ['dr-single-leg-march'], ['dr-bridge'], ['dr-heel-slide'], ['dr-toe-taps'],
      ['dr-side-lying-leg', 'Right side'], ['dr-side-lying-leg', 'Left side'],
      ['dr-pelvic-tilt'], ['dr-tabletop-breathing'], ['dr-quadruped-hold'], ['dr-tva-activation'], ['dr-360-breathing', 'Relax & recover'],
    ],
  },
  'pfw-20': {
    group: 'pf', minutes: 20, title: 'Pelvic Floor · 20-Min Workout', emoji: '🌸', level: 'intermediate', work: 45, rest: 10,
    blurb: 'A Pilates-inspired pelvic floor and deep-core flow — 22 moves, 45 seconds each with 10 seconds to switch. Builds strength, control and the ability to relax.',
    moves: [
      ['pelvic-relax-breath'], ['kegel-identify'], ['dr-tva-activation'], ['dr-pelvic-tilt'], ['kegel-slow'], ['kegel-quick'],
      ['dr-heel-slide'], ['dr-single-leg-march'], ['kegel-bridge'], ['pf-squeeze-bridge'], ['pf-bridge-march'],
      ['clamshell', 'Right side'], ['clamshell', 'Left side'], ['side-leg-raise', 'Right side'], ['side-leg-raise', 'Left side'],
      ['dr-tabletop-breathing'], ['cat-cow'], ['dr-bird-dog'], ['kegel-elevator'], ['pf-sumo-lift'], ['kegel-standing'], ['childs-pose', 'Breathe & release'],
    ],
  },
};

const PF_NOTES = [
  'Each move runs for a set time. Lift the pelvic floor gently on the out-breath and always let it relax fully — relaxing is as important as lifting.',
  KEGEL_SAFETY,
];

const NOTES = [
  'Each move runs for a set time — go slowly and keep breathing out on the effort. A short pause lets you get into the next position.',
  'Start only after your doctor clears you: usually around 6–8 weeks after a vaginal birth or 8–10 weeks after a C-section. Begin with the Gentle version.',
  DR_SAFETY,
  DR_PROGRAM,
];

const cache = new Map();
export function drWorkout(id) {
  if (cache.has(id)) return cache.get(id);
  const p = PROGRAMS[id];
  if (!p) return null;
  const exercises = p.moves.map(([exId, side], i) => {
    const e = EXERCISE_BY_ID[exId];
    return {
      exercise_id: e.id, name: side ? `${e.name} · ${side}` : e.name, phase: 'main', order: i, sets: 1, reps: null, duration_min: null,
      work_seconds: p.work, rest_seconds: p.rest, category: e.category, impact: e.impact,
      target_muscles: e.target_muscles, equipment: e.equipment, safety_notes: e.safety_notes, instructions: e.instructions,
    };
  });
  const totalSecs = exercises.length * p.work + (exercises.length - 1) * p.rest;
  const w = {
    id, interval: true, dr_program: true, theme: p.group === 'pf' ? 'pelvic-floor' : 'diastasis-recti', title: p.title, emoji: p.emoji, blurb: p.blurb, level: p.level,
    duration_min: p.minutes, est_total_minutes: Math.round(totalSecs / 60), rounds: 1, round_rest: 0,
    format: `${p.work}-${p.rest}`, format_label: `${p.work} s per move · ${p.rest} s to switch`, exercises, notes: p.group === 'pf' ? PF_NOTES : NOTES, group: p.group,
  };
  cache.set(id, w);
  return w;
}

export function drWorkoutList(group = 'dr') {
  return Object.keys(PROGRAMS).filter((id) => PROGRAMS[id].group === group).map((id) => {
    const w = drWorkout(id);
    return { id, title: w.title, emoji: w.emoji, blurb: w.blurb, level: w.level, minutes: w.duration_min, est_total_minutes: w.est_total_minutes, format_label: w.format_label, moves: w.exercises.map((x) => ({ id: x.exercise_id, name: x.name })) };
  });
}
