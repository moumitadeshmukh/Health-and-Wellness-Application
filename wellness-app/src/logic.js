// Business rules from backend-spec §5: BMI, sleep, habits, recipe ranking, workout plans, summaries.
import { db } from './db.js';
import { RECIPES } from './data/recipes.js';
import { EXERCISES, EXERCISE_BY_ID, KEGEL_SAFETY, DR_SAFETY, DR_PROGRAM, CATEGORIES, SPOT_REDUCTION_DISCLAIMER } from './data/exercises.js';

// ---------- dates (server local time = the user's computer) ----------
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}
export function dateRange(endDate, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(addDays(endDate, -i));
  return out;
}

// ---------- BMI ----------
export const BMI_DISCLAIMER =
  'BMI is a screening tool and does not directly measure body fat or determine complete health status. Adult BMI categories do not account for muscle mass, bone density, age, sex, ethnicity or pregnancy. Please consult a healthcare professional for a personal assessment.';

export function calculateBmi(heightCm, weightKg, age) {
  const h = heightCm / 100;
  const bmi = Math.round((weightKg / (h * h)) * 10) / 10;
  const range = { min_kg: Math.round(18.5 * h * h * 10) / 10, max_kg: Math.round(24.9 * h * h * 10) / 10 };
  if (age !== undefined && age !== null && age < 18) {
    return {
      bmi, category: null, healthy_range: null,
      message: 'Adult BMI categories do not apply to people under 18. Children and teens are assessed with age- and sex-specific growth charts — please ask a doctor or paediatrician for guidance.',
      disclaimer: BMI_DISCLAIMER,
    };
  }
  let category;
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'healthy_weight';
  else if (bmi < 30) category = 'overweight';
  else category = 'obesity';
  return { bmi, category, healthy_range: range, disclaimer: BMI_DISCLAIMER };
}

// ---------- sleep ----------
export function sleepDurationMinutes(bedtime, wakeTime) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const b = toMin(bedtime);
  const w = toMin(wakeTime);
  return w > b ? w - b : 24 * 60 - b + w;
}

// ---------- per-user lookups ----------
export const profileOf = (userId) => db.find('profiles', (p) => p.user_id === userId) || {};

export function latestWeight(userId) {
  const recs = db.where('weight_records', (r) => r.user_id === userId);
  if (!recs.length) return null;
  return recs.reduce((a, b) => (a.recorded_date > b.recorded_date || (a.recorded_date === b.recorded_date && a.created_at > b.created_at) ? a : b));
}

export function currentWeightKg(userId) {
  const w = latestWeight(userId);
  return w ? w.weight_kg : profileOf(userId).weight_kg ?? null;
}

// ---------- daily summary (F8) ----------
export function mealItemsTotals(items) {
  const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const i of items) {
    t.calories += i.calories_est || 0; t.protein_g += i.protein_est || 0; t.carbs_g += i.carbs_est || 0;
    t.fat_g += i.fat_est || 0; t.fiber_g += i.fiber_est || 0;
  }
  for (const k of Object.keys(t)) t[k] = Math.round(t[k] * 10) / 10;
  return { ...t, is_estimate: true };
}

export function dailySummary(userId, date) {
  const profile = profileOf(userId);
  const steps = db.find('step_records', (r) => r.user_id === userId && r.recorded_date === date);
  const water = db.where('water_entries', (r) => r.user_id === userId && r.date === date);
  const meals = db.where('meal_logs', (r) => r.user_id === userId && r.date === date);
  const sleep = db.find('sleep_records', (r) => r.user_id === userId && r.recorded_date === date);
  const weight = db.find('weight_records', (r) => r.user_id === userId && r.recorded_date === date);
  const lastMeal = db.where('last_meals', (r) => r.user_id === userId && r.recorded_date === date)
    .sort((a, b) => (a.meal_time < b.meal_time ? 1 : -1))[0];
  const sessions = db.where('workout_sessions', (r) => r.user_id === userId && r.date === date && r.completed_at);
  const waterTotal = water.reduce((s, e) => s + e.amount_ml, 0);
  const nutrition = mealItemsTotals(meals.flatMap((m) => m.items));

  const habits = {
    steps_logged: Boolean(steps),
    water_logged: water.length > 0,
    meal_logged: meals.length > 0,
    sleep_logged: Boolean(sleep),
    weight_logged: Boolean(weight),
  };
  const done = Object.values(habits).filter(Boolean).length;
  return {
    date,
    steps: { count: steps?.step_count || 0, goal: profile.step_goal || 8000, source: steps?.source || null },
    water: { total_ml: waterTotal, goal_ml: profile.water_goal_ml || 2500, entries: water.length },
    meals: { count: meals.length, types: [...new Set(meals.map((m) => m.meal_type))], nutrition },
    sleep: sleep ? { duration_minutes: sleep.duration_minutes, bedtime: sleep.bedtime, wake_time: sleep.wake_time } : null,
    wake_time: sleep?.wake_time || null,
    last_meal_time: lastMeal?.meal_time || null,
    weight_kg: weight?.weight_kg ?? null,
    workouts: { completed: sessions.length, minutes: sessions.reduce((s, x) => s + (x.total_duration_min || 0), 0) },
    habits,
    habit_completion_pct: Math.round((done / 5) * 100),
  };
}

// ---------- streaks (F14) ----------
export function streaks(userId, today) {
  const sets = {
    steps: new Set(db.where('step_records', (r) => r.user_id === userId).map((r) => r.recorded_date)),
    water: new Set(db.where('water_entries', (r) => r.user_id === userId).map((r) => r.date)),
    meals: new Set(db.where('meal_logs', (r) => r.user_id === userId).map((r) => r.date)),
    sleep: new Set(db.where('sleep_records', (r) => r.user_id === userId).map((r) => r.recorded_date)),
    weight: new Set(db.where('weight_records', (r) => r.user_id === userId).map((r) => r.recorded_date)),
    workout: new Set(db.where('workout_sessions', (r) => r.user_id === userId && r.completed_at).map((r) => r.date)),
  };
  const out = {};
  for (const [habit, set] of Object.entries(sets)) {
    let current = 0;
    let d = set.has(today) ? today : addDays(today, -1);
    while (set.has(d)) { current++; d = addDays(d, -1); }
    let longest = 0; let run = 0;
    const sorted = [...set].sort();
    let prev = null;
    for (const day of sorted) {
      run = prev && addDays(prev, 1) === day ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = day;
    }
    out[habit] = { current, longest, total_days: set.size };
  }
  return out;
}

// ---------- recipes (F9) ----------
const PANTRY = ['salt', 'oil', 'ghee or oil', 'turmeric', 'cumin seeds', 'mustard seeds', 'water'];
const DIET_ALLOWED = {
  vegan: ['vegan'],
  vegetarian: ['vegan', 'vegetarian'],
  eggetarian: ['vegan', 'vegetarian', 'eggetarian'],
  non_vegetarian: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'],
  other: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'],
};
const norm = (s) => String(s).toLowerCase().trim();
const looseMatch = (a, b) => {
  const x = norm(a); const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const core = (s) => s.replace(/\(.*?\)/g, '').trim();
  const cx = core(x); const cy = core(y);
  return (cx.length > 2 && cy.includes(cx)) || (cy.length > 2 && cx.includes(cy)) || x.includes(`(${y})`) || y.includes(`(${x})`);
};

export function recipeConflicts(recipe, terms) {
  const hits = [];
  for (const t of terms.map(norm).filter(Boolean)) {
    if (recipe.allergens.some((a) => looseMatch(a, t)) || recipe.ingredients.some((i) => looseMatch(i.name, t))) hits.push(t);
  }
  return hits;
}

export function rankRecipes({ ingredients = [], avoid = [], mealType, diet, nutrition, allergies = [], cuisine, maxTime }) {
  const have = ingredients.map(norm).filter(Boolean);
  const allowedDiets = DIET_ALLOWED[diet] || DIET_ALLOWED.other;
  const results = [];
  for (const recipe of RECIPES) {
    if (mealType && recipe.meal_type !== mealType) continue;
    if (!allowedDiets.includes(recipe.diet)) continue;
    if (nutrition && !recipe.tags.includes(nutrition)) continue;
    if (cuisine === 'south' ? recipe.region !== 'south' : cuisine && recipe.cuisine !== cuisine) continue;
    if (maxTime && recipe.prep_time_min + recipe.cook_time_min > maxTime) continue;
    if (recipeConflicts(recipe, allergies).length) continue;
    if (recipeConflicts(recipe, avoid).length) continue;
    const required = recipe.ingredients.filter((i) => !i.is_optional && !PANTRY.includes(norm(i.name)));
    const matched = recipe.ingredients.filter((i) => have.some((h) => looseMatch(i.name, h))).map((i) => i.name);
    const missing = required.filter((i) => !matched.includes(i.name)).map((i) => i.name);
    results.push({
      ...summaryRecipe(recipe),
      match_count: matched.length,
      missing_count: missing.length,
      matched_ingredients: matched,
      missing_ingredients: missing,
      match_score: required.length ? Math.round(((required.length - missing.length) / required.length) * 100) : 100,
    });
  }
  results.sort((a, b) => {
    if (have.length) {
      if (b.match_count !== a.match_count) return b.match_count - a.match_count;
      if (a.missing_count !== b.missing_count) return a.missing_count - b.missing_count;
    }
    return a.total_time_min - b.total_time_min;
  });
  return have.length ? results.filter((x) => x.match_count > 0) : results;
}

export const summaryRecipe = (r) => ({
  id: r.id, name: r.name, emoji: r.emoji, meal_type: r.meal_type, cuisine: r.cuisine, region: r.region, diet: r.diet,
  dietary_tags: [r.diet, ...r.tags], difficulty: r.difficulty, prep_time_min: r.prep_time_min,
  cook_time_min: r.cook_time_min, total_time_min: r.prep_time_min + r.cook_time_min, servings: r.servings,
  calories_per_serving: r.nutrition.calories, is_estimate: true,
});

// ---------- workout planner (F12) ----------
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const GOAL_CATEGORIES = {
  weight_loss: ['full_body', 'stamina', 'hip_lower_body', 'core', 'low_impact'],
  weight_maintenance: ['full_body', 'hip_lower_body', 'core', 'chest_toning', 'stamina'],
  muscle_toning: ['chest_toning', 'hip_lower_body', 'core', 'full_body'],
  stamina_improvement: ['stamina', 'full_body', 'low_impact', 'core'],
  general_wellness: ['low_impact', 'core', 'hip_lower_body', 'mobility', 'yoga', 'stamina', 'posture'],
};

export function estimateMinutes(e, sets = e.sets, reps = e.reps, duration = e.duration_min) {
  const s = sets || 1;
  if (duration) return Math.max(1, Math.round((duration * s * 60 + (s - 1) * (e.rest_seconds || 0)) / 60));
  return Math.max(1, Math.round((s * ((reps || 10) * 4 + (e.rest_seconds || 30))) / 60));
}

const planRow = (e, phase, order) => ({
  exercise_id: e.id, name: e.name, category: e.category, difficulty: e.difficulty, phase, order_index: order,
  sets: e.sets, reps: e.reps, duration_min: e.duration_min, rest_seconds: e.rest_seconds,
  est_minutes: estimateMinutes(e), impact: e.impact,
});

let rand = Math.random;
function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function pick(list, n, avoidIds) {
  const fresh = list.filter((e) => !avoidIds.has(e.id));
  const pool = [...shuffle(fresh), ...shuffle(list.filter((e) => avoidIds.has(e.id)))];
  return pool.slice(0, n);
}
function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

const GENTLE = new Set(['kegel_pelvic', 'facial', 'recovery', 'diastasis_recti']);

export function generateWorkoutPlan(opts) {
  rand = opts.seed ? seeded(opts.seed) : Math.random;
  try { return buildPlan(opts); } finally { rand = Math.random; }
}

function buildPlan({ userId, goal = 'general_wellness', level = 'beginner', duration = 20, equipment = [], lowImpact = false, category = null, categories = null, title = null }) {
  const levelIdx = Math.max(0, LEVELS.indexOf(level));
  const have = new Set(['none', ...equipment]);
  const ok = (e) => e.equipment.every((q) => have.has(q)) && LEVELS.indexOf(e.difficulty) <= levelIdx + 1 && (!lowImpact || e.impact === 'low');

  const recent = !userId ? [] : db.where('workout_plans', (p) => p.user_id === userId).slice(-2).flatMap((p) => p.exercises.map((x) => x.exercise_id));
  const avoid = new Set(recent);

  const focusList = categories?.length ? categories : category ? [category] : [];
  const focus = focusList.length ? CATEGORIES.find((c) => c.id === focusList[0]) : null;
  const gentle = focus && GENTLE.has(focus.id);
  const warm = gentle ? [EXERCISE_BY_ID['deep-breathing']]
    : pick(EXERCISES.filter((e) => e.category === 'warmup' && e.category !== category && ok(e)), focus?.id === 'warmup' ? 1 : 2, avoid);
  const cool = gentle ? [EXERCISE_BY_ID[focus.id === 'facial' ? 'chin-tuck' : 'childs-pose']] : [
    ...pick(EXERCISES.filter((e) => e.category === 'cooldown' && e.category !== category && ok(e)), 1, avoid),
    ...pick(EXERCISES.filter((e) => e.category === 'stretching' && e.category !== category && ok(e)), duration >= 20 ? 2 : 1, avoid),
  ];
  const fixed = [...warm, ...cool].reduce((s, e) => s + estimateMinutes(e), 0);
  let budget = Math.max(4, duration - fixed);

  const cats = focus ? focusList : GOAL_CATEGORIES[goal] || GOAL_CATEGORIES.general_wellness;
  let pool = EXERCISES.filter((e) => cats.includes(e.category) && ok(e));
  if (focus && !pool.length) {
    // Nothing at this level: allow any level, but keep equipment and low-impact limits.
    pool = EXERCISES.filter((e) => focusList.includes(e.category) && e.equipment.every((q) => have.has(q)) && (!lowImpact || e.impact === 'low'));
  }
  if (focus && !pool.length) {
    const err = new Error(`No ${focus.name} exercises match your equipment and low-impact choices. Try selecting more equipment or turning off low-impact.`);
    err.code = 'NO_MATCH';
    throw err;
  }
  // Prefer the user's own level, then one level above.
  const candidates = pool
    .sort((a, b) => Math.abs(LEVELS.indexOf(a.difficulty) - levelIdx) - Math.abs(LEVELS.indexOf(b.difficulty) - levelIdx));
  const lvl = (e) => LEVELS.indexOf(e.difficulty);
  const exact = candidates.filter((e) => lvl(e) === levelIdx);
  const lower = candidates.filter((e) => lvl(e) < levelIdx);
  const above = candidates.filter((e) => lvl(e) > levelIdx);
  // Mostly the user's own level, mixed with some easier moves; one level above only as a fallback.
  const ordered = [...pick(exact, 50, avoid), ...pick(lower, 50, avoid), ...pick(above, 50, avoid)];

  // Long timed cardio (e.g. a 20-min walk) is shortened to fit; everything else must fit the remaining time.
  const fitted = (e, remaining) => {
    // Category plans favour variety: 2 sets of more exercises (rounds can repeat the circuit later).
    if (focus && e.sets > 2) {
      const m2 = estimateMinutes(e, 2);
      if (m2 <= remaining) return { e, mins: m2, duration: e.duration_min, sets: 2 };
    }
    const mins = estimateMinutes(e);
    if (mins <= remaining) return { e, mins, duration: e.duration_min };
    if (e.duration_min && e.duration_min >= 5 && e.sets === 1 && remaining >= 3) {
      const d = Math.max(3, Math.min(e.duration_min, Math.floor(remaining * 0.6)));
      return { e, mins: d, duration: d };
    }
    return null;
  };
  const main = [];
  const usedCats = new Map();
  for (const e of ordered) {
    if (budget <= 0) break;
    if (!focus && (usedCats.get(e.category) || 0) >= 3) continue;
    const f = fitted(e, budget);
    if (!f) continue;
    main.push(f);
    usedCats.set(e.category, (usedCats.get(e.category) || 0) + 1);
    budget -= f.mins;
  }
  if (main.length < 2) {
    for (const e of [...ordered].sort((a, b) => estimateMinutes(a) - estimateMinutes(b))) {
      if (main.length >= 2) break;
      if (!main.some((m) => m.e.id === e.id)) main.push({ e, mins: estimateMinutes(e), duration: e.duration_min });
    }
  }

  // Category plans: repeat the main circuit as rounds to fill the time (Kegel/facial capped at 2 rounds).
  let rounds = 1;
  if (focus) {
    const circuit = main.reduce((t, m) => t + m.mins, 0) || 1;
    rounds = Math.max(1, Math.min(gentle ? 2 : 3, Math.round((duration - fixed) / circuit)));
  }
  const exercises = [
    ...warm.map((e, i) => planRow(e, 'warmup', i)),
    ...main.map((m, i) => {
      const row = planRow(m.e, 'main', warm.length + i);
      if (m.duration !== m.e.duration_min || m.sets) { row.duration_min = m.duration; row.est_minutes = m.mins; }
      if (m.sets) row.sets = m.sets;
      if (rounds > 1) { row.rounds = rounds; row.est_minutes *= rounds; }
      return row;
    }),
    ...cool.map((e, i) => planRow(e, 'cooldown', warm.length + main.length + i)),
  ];

  const last3 = [1, 2, 3].map((n) => addDays(localDate(), -n));
  const trainedEveryDay = Boolean(userId) && last3.every((d) => db.find('workout_sessions', (s) => s.user_id === userId && s.date === d && s.completed_at));
  const notes = [];
  if (trainedEveryDay) notes.push('You have trained 3 days in a row — consider a lighter session or a rest/recovery day today.');
  if (main.some((m) => m.e.category === 'kegel_pelvic')) notes.push(KEGEL_SAFETY);
  if (main.some((m) => m.e.category === 'diastasis_recti')) notes.unshift(DR_SAFETY, DR_PROGRAM);
  if (rounds > 1) notes.unshift(`Do the main exercises as a circuit and repeat it ${rounds} times, resting about a minute between rounds.`);
  if (focus?.spot_disclaimer) notes.push(`${SPOT_REDUCTION_DISCLAIMER} Stop if you feel pain, dizziness or chest discomfort.`);
  else notes.push('Exercise strengthens muscles but cannot target fat loss in one area. Stop if you feel pain, dizziness or chest discomfort.');
  const total = exercises.reduce((t, x) => t + x.est_minutes, 0);
  if (focus && total < duration - 5) notes.push(`${focus.name} works best in shorter sessions, so this plan is about ${total} minutes rather than ${duration}.`);

  return {
    name: title || (focus ? `${focus.icon} ${focus.name} — ${duration} min (${level})` : `${duration}-min ${goal.replace(/_/g, ' ')} (${level})`),
    focus_category: focus?.id || null,
    fitness_goal: goal, fitness_level: level, duration_min: duration, low_impact: lowImpact, equipment: [...have], rounds,
    exercises, notes, est_total_minutes: exercises.reduce((s, x) => s + x.est_minutes, 0),
  };
}

export const exerciseExists = (id) => Boolean(EXERCISE_BY_ID[id]);
