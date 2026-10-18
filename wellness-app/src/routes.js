// All /api/v1 endpoints (api-contract-spec §5).
import crypto from 'node:crypto';
import { db, nowIso } from './db.js';
import {
  createRouter, ApiError, badRequest, notFound, num, str, dateField, timeField, paginate, sendJson, DATE_RE,
} from './http.js';
import { config, saveAiSettings } from './config.js';
import { hashPassword, verifyPassword, createToken, sessionCookie, clearCookie, rateLimit } from './auth.js';
import {
  localDate, addDays, dateRange, calculateBmi, sleepDurationMinutes, profileOf, latestWeight, currentWeightKg,
  dailySummary, mealItemsTotals, streaks, rankRecipes, summaryRecipe, generateWorkoutPlan, estimateMinutes, recipeConflicts,
} from './logic.js';
import { FOODS, FOOD_BY_ID } from './data/foods.js';
import { RECIPES, RECIPE_BY_ID, INGREDIENTS } from './data/recipes.js';
import { EXERCISES, EXERCISE_BY_ID, CATEGORIES, SPOT_REDUCTION_DISCLAIMER, KEGEL_SAFETY, DR_SAFETY, DR_PROGRAM } from './data/exercises.js';
import { readyWorkout, readyWorkoutList, LEVELS as WORKOUT_LEVELS } from './workouts.js';
import { intervalWorkout, intervalOptions } from './intervals.js';
import { challengeWorkout, challengePlan, challengeProgress } from './challenge.js';
import { drWorkout, drWorkoutList } from './drworkouts.js';
import {
  GREETING, detectEmergency, emergencyResponse, chatReply, mealPlan, aiWorkoutPick, aiStatus, checkAiQuota, testAiKey,
} from './ai.js';

export const router = createRouter();
const R = router;
const ok = (data, meta = {}) => ({ status: 200, body: { data, meta } });
const created = (data) => ({ status: 201, body: { data, meta: {} } });
const noContent = () => ({ status: 204 });

const ENUMS = {
  activity_level: ['sedentary', 'lightly_active', 'moderately_active', 'very_active'],
  fitness_goal: ['weight_loss', 'weight_maintenance', 'muscle_toning', 'stamina_improvement', 'general_wellness'],
  dietary_preference: ['vegetarian', 'vegan', 'non_vegetarian', 'eggetarian', 'other'],
  exercise_intensity: ['beginner', 'intermediate', 'advanced'],
  gender: ['female', 'male', 'non_binary', 'prefer_not_to_say', 'other'],
  meal_type: ['breakfast', 'lunch', 'dinner', 'snack', 'beverage'],
  reminder_type: ['water', 'meal', 'movement', 'workout', 'bedtime', 'weight_log', 'progress_review'],
  frequency: ['daily', 'weekdays', 'weekends', 'custom'],
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const own = (collection, id, user) => {
  const row = db.byId(collection, id);
  if (!row || row.user_id !== user.id) throw notFound();
  return row;
};
const qDate = (q, key = 'date') => {
  const v = q.get(key);
  if (!v) return localDate();
  if (!DATE_RE.test(v)) throw badRequest(`${key} must be YYYY-MM-DD`);
  return v;
};
const inRange = (q, field) => {
  const to = q.get('to') || localDate();
  const from = q.get('from') || addDays(to, -29);
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw badRequest('from/to must be YYYY-MM-DD');
  return (r) => r[field] >= from && r[field] <= to;
};
const sortDesc = (field) => (a, b) => (a[field] < b[field] ? 1 : a[field] > b[field] ? -1 : (a.created_at < b.created_at ? 1 : -1));

function publicUser(user) {
  const profile = profileOf(user.id);
  return {
    user: { id: user.id, email: user.email, created_at: user.created_at },
    profile,
    onboarded: Boolean(profile.onboarded),
    current_weight_kg: currentWeightKg(user.id) || profile.weight_kg || null,
  };
}

// =================== AUTH ===================
R.post('/auth/register', ({ body, ip }) => {
  rateLimit(`register:${ip}`, 20, 15 * 60_000);
  const name = str(body, 'name', { max: 100 });
  const email = str(body, 'email', { max: 200 }).toLowerCase();
  const password = body.password;
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address', [{ field: 'email', issue: 'invalid email' }]);
  if (typeof password !== 'string' || password.length < 8) throw badRequest('Password must be at least 8 characters', [{ field: 'password', issue: 'min 8 characters' }]);
  if (db.find('users', (u) => u.email === email)) throw new ApiError(409, 'CONFLICT', 'An account with this email already exists. Try signing in instead.');
  const user = db.insert('users', { email, password_hash: hashPassword(password), session_version: 0 });
  db.insert('profiles', { user_id: user.id, name, step_goal: 8000, water_goal_ml: 2500, onboarded: false, allergies: [] });
  db.insert('notifications', { user_id: user.id, title: 'Welcome to WellnessApp 🌱', body: 'Complete your profile to get personalised goals, recipes and workouts.', is_read: false });
  return { status: 201, body: { data: publicUser(user), meta: {} }, headers: { 'Set-Cookie': sessionCookie(createToken(user)) } };
}, { auth: false });

R.post('/auth/login', ({ body, ip }) => {
  rateLimit(`login:${ip}`, 30, 15 * 60_000);
  const email = String(body.email || '').trim().toLowerCase();
  const user = db.find('users', (u) => u.email === email);
  if (!user || !verifyPassword(String(body.password || ''), user.password_hash)) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Email or password is incorrect.');
  }
  return { status: 200, body: { data: publicUser(user), meta: {} }, headers: { 'Set-Cookie': sessionCookie(createToken(user)) } };
}, { auth: false });

R.post('/auth/refresh', ({ user }) => ({ status: 200, body: { data: { ok: true }, meta: {} }, headers: { 'Set-Cookie': sessionCookie(createToken(user)) } }));

R.post('/auth/logout', () => ({ status: 204, headers: { 'Set-Cookie': clearCookie() } }), { auth: false });

R.post('/auth/password-reset/request', ({ body, ip }) => {
  rateLimit(`reset:${ip}`, 10, 15 * 60_000);
  const email = String(body.email || '').trim().toLowerCase();
  const user = db.find('users', (u) => u.email === email);
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    db.remove('password_resets', (r) => r.user_id === user.id);
    db.insert('password_resets', { user_id: user.id, token_hash: crypto.createHash('sha256').update(token).digest('hex'), expires_at: Date.now() + 30 * 60_000 });
    // Local edition: no email server, so the reset code is printed in the terminal running the app.
    console.log(`\n[Password reset] Code for ${email}: ${token}\n(valid for 30 minutes)\n`);
  }
  return ok({ message: 'If that email is registered, a reset code has been issued. In this local version the code appears in the terminal window running the app.' });
}, { auth: false });

R.post('/auth/password-reset/confirm', ({ body }) => {
  const token = String(body.token || '').trim();
  const password = body.password;
  if (typeof password !== 'string' || password.length < 8) throw badRequest('Password must be at least 8 characters');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const rec = db.find('password_resets', (r) => r.token_hash === hash && r.expires_at > Date.now());
  if (!rec) throw badRequest('This reset code is invalid or has expired.');
  const user = db.byId('users', rec.user_id);
  db.update('users', user.id, { password_hash: hashPassword(password), session_version: (user.session_version || 0) + 1 });
  db.remove('password_resets', (r) => r.user_id === user.id);
  return ok({ message: 'Password updated. Please sign in.' });
}, { auth: false });

// =================== USERS & PROFILE ===================
R.get('/users/me', ({ user }) => ok(publicUser(user)));

R.patch('/users/me/profile', ({ user, body }) => {
  const p = profileOf(user.id);
  const patch = {};
  if ('name' in body) patch.name = str(body, 'name', { max: 100 });
  if ('age' in body) patch.age = num(body, 'age', { min: 13, max: 120, int: true });
  if ('gender' in body) patch.gender = str(body, 'gender', { required: false, oneOf: ENUMS.gender }) || null;
  if ('height_cm' in body) patch.height_cm = num(body, 'height_cm', { min: 50, max: 250 });
  if ('weight_kg' in body) patch.weight_kg = num(body, 'weight_kg', { min: 20, max: 300 });
  for (const k of ['activity_level', 'fitness_goal', 'dietary_preference', 'exercise_intensity']) {
    if (k in body) patch[k] = str(body, k, { oneOf: ENUMS[k] });
  }
  if ('allergies' in body) {
    const a = Array.isArray(body.allergies) ? body.allergies : String(body.allergies || '').split(',');
    patch.allergies = a.map((x) => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 30);
  }
  if ('dietary_restrictions' in body) patch.dietary_restrictions = str(body, 'dietary_restrictions', { required: false, max: 300 }) || '';
  if ('wake_time' in body) patch.wake_time = timeField(body, 'wake_time');
  if ('sleep_time' in body) patch.sleep_time = timeField(body, 'sleep_time');
  if ('step_goal' in body) patch.step_goal = num(body, 'step_goal', { min: 1000, max: 50000, int: true });
  if ('water_goal_ml' in body) patch.water_goal_ml = num(body, 'water_goal_ml', { min: 500, max: 6000, int: true });
  if ('onboarded' in body) patch.onboarded = Boolean(body.onboarded);
  const updated = db.update('profiles', p.id, patch);
  // Record a starting weight entry the first time weight is set
  if (patch.weight_kg && !latestWeight(user.id)) {
    db.insert('weight_records', { user_id: user.id, weight_kg: patch.weight_kg, recorded_date: localDate(), notes: 'From profile' });
  }
  return ok(updated);
});

R.delete('/users/me', ({ user, body }) => {
  if (body.confirm !== 'DELETE') throw badRequest('Type DELETE to confirm account deletion', [{ field: 'confirm', issue: 'must equal DELETE' }]);
  for (const c of db.collections) {
    if (c === 'users') continue;
    db.remove(c, (r) => r.user_id === user.id);
  }
  db.remove('users', (u) => u.id === user.id);
  return { status: 204, headers: { 'Set-Cookie': clearCookie() } };
});

R.post('/users/me/export', ({ user, body }) => {
  const out = { exported_at: nowIso(), account: { email: user.email, created_at: user.created_at } };
  for (const c of db.collections) {
    if (['users', 'password_resets'].includes(c)) continue;
    out[c] = db.where(c, (r) => r.user_id === user.id);
  }
  if (body.format !== 'csv') return ok(out);
  // One flat CSV of all health records: record_type, date, time, value, unit, details
  const rows = [['record_type', 'date', 'time', 'value', 'unit', 'details']];
  const p = out.profiles[0] || {};
  rows.push(['profile', '', '', '', '', `name=${p.name || ''}; age=${p.age ?? ''}; height_cm=${p.height_cm ?? ''}; goal=${p.fitness_goal || ''}; diet=${p.dietary_preference || ''}; allergies=${(p.allergies || []).join('|')}`]);
  for (const r of out.weight_records) rows.push(['weight', r.recorded_date, '', r.weight_kg, 'kg', r.notes || '']);
  for (const r of out.step_records) rows.push(['steps', r.recorded_date, '', r.step_count, 'steps', r.source]);
  for (const r of out.water_entries) rows.push(['water', r.date, r.time, r.amount_ml, 'ml', '']);
  for (const r of out.sleep_records) rows.push(['sleep', r.recorded_date, `${r.bedtime}-${r.wake_time}`, r.duration_minutes, 'minutes', r.notes || '']);
  for (const r of out.last_meals) rows.push(['last_meal', r.recorded_date, r.meal_time, '', '', '']);
  for (const m of out.meal_logs) {
    const t = mealItemsTotals(m.items);
    rows.push(['meal', m.date, m.time, t.calories, 'kcal (estimate)', `${m.meal_type}: ${m.items.map((i) => i.name).join(' + ')}`]);
  }
  for (const s of out.workout_sessions) rows.push(['workout', s.date, s.started_at.slice(11, 16), s.total_duration_min ?? '', 'minutes', `${s.plan_name}; ${s.completions.filter((c) => c.completed).length}/${s.completions.length} exercises${s.completed_at ? '' : ' (not finished)'}`]);
  const cell = (v) => { const x = String(v ?? ''); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
  return ok({ filename: `wellness-export-${localDate()}.csv`, content: rows.map((r) => r.map(cell).join(',')).join('\r\n') });
});

// =================== BMI & WEIGHT ===================
R.post('/bmi/calculate', ({ user, body }) => {
  const p = profileOf(user.id);
  const height = body.height_cm !== undefined ? num(body, 'height_cm', { min: 50, max: 250 }) : p.height_cm;
  const weight = body.weight_kg !== undefined ? num(body, 'weight_kg', { min: 20, max: 300 }) : currentWeightKg(user.id);
  if (!height || !weight) throw badRequest('Height and weight are needed to calculate BMI');
  return ok({ height_cm: height, weight_kg: weight, ...calculateBmi(height, weight, p.age) });
});

R.get('/weight', ({ user, query }) => {
  const list = db.where('weight_records', (r) => r.user_id === user.id).filter(query.get('from') || query.get('to') ? inRange(query, 'recorded_date') : () => true).sort(sortDesc('recorded_date'));
  const view = query.get('view');
  if (view && view !== 'daily') {
    if (!['weekly', 'monthly', 'yearly'].includes(view)) throw badRequest('view must be daily, weekly, monthly or yearly');
    const keyOf = {
      weekly: (d) => { const [y, m, dd] = d.split('-').map(Number); const x = new Date(y, m - 1, dd); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return localDate(x); },
      monthly: (d) => d.slice(0, 7),
      yearly: (d) => d.slice(0, 4),
    }[view];
    const groups = new Map();
    for (const r of [...list].reverse()) { const k = keyOf(r.recorded_date); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.weight_kg); }
    const data = [...groups.entries()].map(([period, v]) => ({ period, avg_weight_kg: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10, min_kg: Math.min(...v), max_kg: Math.max(...v), entries: v.length }));
    return ok(data, { view, total: data.length });
  }
  return { status: 200, body: paginate(list, query) };
});

R.post('/weight', ({ user, body }) => {
  const weight_kg = num(body, 'weight_kg', { min: 20, max: 300 });
  const recorded_date = dateField(body, 'date', { required: false }) || localDate();
  const notes = str(body, 'notes', { required: false, max: 300 }) || '';
  const existing = db.find('weight_records', (r) => r.user_id === user.id && r.recorded_date === recorded_date);
  const row = existing ? db.update('weight_records', existing.id, { weight_kg, notes }) : db.insert('weight_records', { user_id: user.id, weight_kg, recorded_date, notes });
  const latest = latestWeight(user.id);
  if (latest && latest.id === row.id) db.update('profiles', profileOf(user.id).id, { weight_kg });
  return created(row);
});

R.patch('/weight/:id', ({ user, params, body }) => {
  own('weight_records', params.id, user);
  const patch = {};
  if ('weight_kg' in body) patch.weight_kg = num(body, 'weight_kg', { min: 20, max: 300 });
  if ('notes' in body) patch.notes = str(body, 'notes', { required: false, max: 300 }) || '';
  return ok(db.update('weight_records', params.id, patch));
});
R.delete('/weight/:id', ({ user, params }) => { own('weight_records', params.id, user); db.remove('weight_records', (r) => r.id === params.id); return noContent(); });

R.get('/weight/goal', ({ user }) => {
  const p = profileOf(user.id);
  return ok({ target_weight_kg: p.target_weight_kg ?? null, target_date: p.target_date ?? null, current_weight_kg: currentWeightKg(user.id), start_weight_kg: p.goal_start_weight_kg ?? null });
});
R.put('/weight/goal', ({ user, body }) => {
  const p = profileOf(user.id);
  const target = num(body, 'target_weight_kg', { min: 20, max: 300 });
  const target_date = dateField(body, 'target_date', { required: false }) || null;
  const current = currentWeightKg(user.id);
  let warning = null;
  if (current && target_date) {
    const weeks = Math.max(1, (Date.parse(target_date) - Date.now()) / (7 * 86400000));
    const perWeek = Math.abs(current - target) / weeks;
    if (perWeek > 1) warning = `That's about ${perWeek.toFixed(1)} kg per week. Many health guidelines suggest around 0.25–1 kg per week is more sustainable — consider a later target date.`;
  }
  if (p.height_cm) {
    const r = calculateBmi(p.height_cm, target, p.age);
    if (r.category === 'underweight') warning = 'This target would be below the healthy BMI range for your height. Please consider a healthier target or talk to a healthcare professional.';
  }
  db.update('profiles', p.id, { target_weight_kg: target, target_date, goal_start_weight_kg: current });
  return ok({ target_weight_kg: target, target_date, current_weight_kg: current, start_weight_kg: current, warning });
});

// =================== STEPS ===================
R.get('/tracker/steps', ({ user, query }) => {
  const list = db.where('step_records', (r) => r.user_id === user.id).filter(inRange(query, 'recorded_date')).sort(sortDesc('recorded_date'));
  return ok(list, { goal: profileOf(user.id).step_goal || 8000 });
});
R.post('/tracker/steps', ({ user, body }) => {
  const step_count = num(body, 'step_count', { min: 0, max: 100000, int: true });
  const recorded_date = dateField(body, 'date', { required: false }) || localDate();
  const mode = body.mode === 'add' ? 'add' : 'set';
  const existing = db.find('step_records', (r) => r.user_id === user.id && r.recorded_date === recorded_date);
  if (existing) return ok(db.update('step_records', existing.id, { step_count: mode === 'add' ? Math.min(100000, existing.step_count + step_count) : step_count }));
  return created(db.insert('step_records', { user_id: user.id, step_count, recorded_date, source: 'manual' }));
});
R.patch('/tracker/steps/:id', ({ user, params, body }) => {
  own('step_records', params.id, user);
  return ok(db.update('step_records', params.id, { step_count: num(body, 'step_count', { min: 0, max: 100000, int: true }) }));
});
R.delete('/tracker/steps/:id', ({ user, params }) => { own('step_records', params.id, user); db.remove('step_records', (r) => r.id === params.id); return noContent(); });
R.get('/tracker/steps/goal', ({ user }) => ok({ daily_goal: profileOf(user.id).step_goal || 8000 }));
R.put('/tracker/steps/goal', ({ user, body }) => {
  const daily_goal = num(body, 'daily_goal', { min: 1000, max: 50000, int: true });
  db.update('profiles', profileOf(user.id).id, { step_goal: daily_goal });
  return ok({ daily_goal });
});

// =================== WATER ===================
R.get('/tracker/water', ({ user, query }) => {
  const filter = query.get('from') || query.get('to') ? inRange(query, 'date') : ((d) => (r) => r.date === d)(qDate(query));
  const list = db.where('water_entries', (r) => r.user_id === user.id).filter(filter).sort(sortDesc('logged_at'));
  return ok(list, { total_ml: list.reduce((s, e) => s + e.amount_ml, 0), goal_ml: profileOf(user.id).water_goal_ml || 2500 });
});
R.post('/tracker/water', ({ user, body }) => {
  const amount_ml = num(body, 'amount_ml', { min: 10, max: 3000, int: true });
  const date = dateField(body, 'date', { required: false }) || localDate();
  const time = timeField(body, 'time', { required: false }) || new Date().toTimeString().slice(0, 5);
  return created(db.insert('water_entries', { user_id: user.id, amount_ml, date, time, logged_at: `${date}T${time}` }));
});
R.patch('/tracker/water/:id', ({ user, params, body }) => {
  own('water_entries', params.id, user);
  return ok(db.update('water_entries', params.id, { amount_ml: num(body, 'amount_ml', { min: 10, max: 3000, int: true }) }));
});
R.delete('/tracker/water/:id', ({ user, params }) => { own('water_entries', params.id, user); db.remove('water_entries', (r) => r.id === params.id); return noContent(); });
R.get('/tracker/water/goal', ({ user }) => ok({ daily_goal_ml: profileOf(user.id).water_goal_ml || 2500 }));
R.put('/tracker/water/goal', ({ user, body }) => {
  const daily_goal_ml = num(body, 'daily_goal_ml', { min: 500, max: 6000, int: true });
  db.update('profiles', profileOf(user.id).id, { water_goal_ml: daily_goal_ml });
  return ok({ daily_goal_ml });
});

// =================== FOODS & MEALS ===================
R.get('/foods/search', ({ user, query }) => {
  const q = (query.get('q') || '').toLowerCase().trim();
  const custom = db.where('custom_foods', (f) => f.user_id === user.id);
  const all = [...custom, ...FOODS];
  const list = q ? all.filter((f) => f.name.toLowerCase().includes(q)) : all;
  return ok(list.slice(0, 25), { total: list.length });
});

function buildMealItem(user, raw) {
  if (raw.food_id) {
    const food = FOOD_BY_ID[raw.food_id] || db.find('custom_foods', (f) => f.id === raw.food_id && f.user_id === user.id);
    if (!food) throw badRequest('Unknown food item');
    const g = num(raw, 'quantity_g', { min: 1, max: 5000 });
    const k = g / 100;
    return {
      food_id: food.id, name: food.name, quantity_g: g,
      calories_est: Math.round(food.calories_per_100g * k), protein_est: +(food.protein_g * k).toFixed(1),
      carbs_est: +(food.carbs_g * k).toFixed(1), fat_est: +(food.fat_g * k).toFixed(1), fiber_est: +(food.fiber_g * k).toFixed(1),
    };
  }
  if (raw.recipe_id) {
    const r = RECIPE_BY_ID[raw.recipe_id];
    if (!r) throw badRequest('Unknown recipe');
    const s = num(raw, 'servings', { min: 0.25, max: 20 });
    return {
      recipe_id: r.id, name: `${r.name} (${s} serving${s === 1 ? '' : 's'})`, servings: s,
      calories_est: Math.round(r.nutrition.calories * s), protein_est: +(r.nutrition.protein_g * s).toFixed(1),
      carbs_est: +(r.nutrition.carbs_g * s).toFixed(1), fat_est: +(r.nutrition.fat_g * s).toFixed(1), fiber_est: +(r.nutrition.fiber_g * s).toFixed(1),
    };
  }
  const name = str(raw, 'name', { max: 120 });
  return {
    name, manual: true,
    calories_est: num(raw, 'calories', { min: 0, max: 5000, required: false }) ?? null,
    protein_est: num(raw, 'protein_g', { min: 0, max: 500, required: false }) ?? null,
    carbs_est: num(raw, 'carbs_g', { min: 0, max: 1000, required: false }) ?? null,
    fat_est: num(raw, 'fat_g', { min: 0, max: 500, required: false }) ?? null,
    fiber_est: num(raw, 'fiber_g', { min: 0, max: 200, required: false }) ?? null,
  };
}

R.get('/tracker/meals', ({ user, query }) => {
  const q = (query.get('q') || '').toLowerCase().trim();
  let list = db.where('meal_logs', (r) => r.user_id === user.id);
  if (q) list = list.filter((m) => m.items.some((i) => i.name.toLowerCase().includes(q)));
  else if (query.get('from') || query.get('to')) list = list.filter(inRange(query, 'date'));
  else { const d = qDate(query); list = list.filter((m) => m.date === d); }
  list = list.sort(sortDesc('logged_at')).map((m) => ({ ...m, totals: mealItemsTotals(m.items) }));
  return ok(list.slice(0, 200), { totals: mealItemsTotals(list.flatMap((m) => m.items)) });
});
R.post('/tracker/meals', ({ user, body }) => {
  const meal_type = str(body, 'meal_type', { oneOf: ENUMS.meal_type });
  const date = dateField(body, 'date', { required: false }) || localDate();
  const time = timeField(body, 'time', { required: false }) || new Date().toTimeString().slice(0, 5);
  if (!Array.isArray(body.items) || !body.items.length) throw badRequest('Add at least one food item');
  const items = body.items.slice(0, 30).map((i) => buildMealItem(user, i));
  if (body.recipe_id || items.some((i) => i.recipe_id)) {
    for (const i of items.filter((x) => x.recipe_id)) db.insert('recipe_history', { user_id: user.id, recipe_id: i.recipe_id, action: 'cooked' });
  }
  return created(db.insert('meal_logs', { user_id: user.id, meal_type, date, time, logged_at: `${date}T${time}`, items }));
});
R.patch('/tracker/meals/:id', ({ user, params, body }) => {
  own('meal_logs', params.id, user);
  const patch = {};
  if ('meal_type' in body) patch.meal_type = str(body, 'meal_type', { oneOf: ENUMS.meal_type });
  if ('items' in body) {
    if (!Array.isArray(body.items) || !body.items.length) throw badRequest('A meal needs at least one item');
    patch.items = body.items.slice(0, 30).map((i) => (i.calories_est !== undefined && i.name ? { ...i } : buildMealItem(user, i)));
  }
  return ok(db.update('meal_logs', params.id, patch));
});
R.delete('/tracker/meals/:id', ({ user, params }) => { own('meal_logs', params.id, user); db.remove('meal_logs', (r) => r.id === params.id); return noContent(); });

// =================== SLEEP ===================
R.get('/tracker/sleep', ({ user, query }) => {
  const list = db.where('sleep_records', (r) => r.user_id === user.id).filter(inRange(query, 'recorded_date')).sort(sortDesc('recorded_date'));
  const last7 = list.filter((r) => r.recorded_date > addDays(localDate(), -7));
  return ok(list, { weekly_avg_minutes: last7.length ? Math.round(last7.reduce((s, r) => s + r.duration_minutes, 0) / last7.length) : null });
});
R.post('/tracker/sleep', ({ user, body }) => {
  const bedtime = timeField(body, 'bedtime');
  const wake_time = timeField(body, 'wake_time');
  const recorded_date = dateField(body, 'date', { required: false }) || localDate();
  const duration_minutes = sleepDurationMinutes(bedtime, wake_time);
  const notes = str(body, 'notes', { required: false, max: 300 }) || '';
  const existing = db.find('sleep_records', (r) => r.user_id === user.id && r.recorded_date === recorded_date);
  if (existing) return ok(db.update('sleep_records', existing.id, { bedtime, wake_time, duration_minutes, notes }));
  return created(db.insert('sleep_records', { user_id: user.id, bedtime, wake_time, duration_minutes, recorded_date, notes }));
});
R.patch('/tracker/sleep/:id', ({ user, params, body }) => {
  const row = own('sleep_records', params.id, user);
  const bedtime = timeField(body, 'bedtime', { required: false }) || row.bedtime;
  const wake_time = timeField(body, 'wake_time', { required: false }) || row.wake_time;
  return ok(db.update('sleep_records', params.id, { bedtime, wake_time, duration_minutes: sleepDurationMinutes(bedtime, wake_time) }));
});
R.delete('/tracker/sleep/:id', ({ user, params }) => { own('sleep_records', params.id, user); db.remove('sleep_records', (r) => r.id === params.id); return noContent(); });

// =================== LAST MEAL ===================
R.get('/tracker/last-meal/today', ({ user, query }) => {
  const d = qDate(query);
  const rec = db.where('last_meals', (r) => r.user_id === user.id && r.recorded_date === d).sort(sortDesc('meal_time'))[0] || null;
  return ok(rec);
});
R.get('/tracker/last-meal', ({ user, query }) => {
  const list = db.where('last_meals', (r) => r.user_id === user.id).filter(inRange(query, 'recorded_date')).sort(sortDesc('recorded_date'));
  return ok(list);
});
R.post('/tracker/last-meal', ({ user, body }) => {
  const meal_time = timeField(body, 'meal_time');
  const recorded_date = dateField(body, 'date', { required: false }) || localDate();
  db.remove('last_meals', (r) => r.user_id === user.id && r.recorded_date === recorded_date);
  return created(db.insert('last_meals', { user_id: user.id, meal_time, recorded_date }));
});
R.delete('/tracker/last-meal/:id', ({ user, params }) => { own('last_meals', params.id, user); db.remove('last_meals', (r) => r.id === params.id); return noContent(); });

// =================== SUMMARY / DASHBOARD ===================
R.get('/tracker/summary', ({ user, query }) => ok(dailySummary(user.id, qDate(query))));

R.get('/dashboard/summary', ({ user, query }) => {
  const today = qDate(query);
  const p = profileOf(user.id);
  const weight = currentWeightKg(user.id);
  const bmi = p.height_cm && weight ? calculateBmi(p.height_cm, weight, p.age) : null;
  const week = dateRange(today, 7).map((d) => {
    const s = dailySummary(user.id, d);
    const w = db.find('weight_records', (r) => r.user_id === user.id && r.recorded_date === d);
    return { date: d, steps: s.steps.count, water_ml: s.water.total_ml, sleep_minutes: s.sleep?.duration_minutes || 0, weight_kg: w?.weight_kg ?? null, habit_pct: s.habit_completion_pct };
  });
  const plan = db.where('workout_plans', (x) => x.user_id === user.id && x.is_active).sort(sortDesc('created_at'))[0];
  const todaysSession = db.where('workout_sessions', (s) => s.user_id === user.id && s.date === today).sort(sortDesc('started_at'))[0];
  const unread = db.where('notifications', (n) => n.user_id === user.id && !n.is_read).length;
  return ok({
    name: p.name, today: dailySummary(user.id, today),
    weight: { current_kg: weight, target_kg: p.target_weight_kg ?? null, start_kg: p.goal_start_weight_kg ?? null },
    bmi, week,
    workout: plan ? { plan_id: plan.id, name: plan.name, exercises: plan.exercises.length, duration_min: plan.duration_min, session: todaysSession || null } : null,
    meals_today: db.where('meal_logs', (m) => m.user_id === user.id && m.date === today).map((m) => ({ id: m.id, meal_type: m.meal_type, items: m.items.map((i) => i.name), calories: mealItemsTotals(m.items).calories })),
    unread_notifications: unread,
    ai: aiStatus(),
  });
});

// =================== INGREDIENTS & RECIPES ===================
R.get('/ingredients/search', ({ query }) => {
  const q = (query.get('q') || '').toLowerCase().trim();
  const list = q ? INGREDIENTS.filter((i) => i.includes(q)) : INGREDIENTS;
  return ok(list.slice(0, 20).map((name) => ({ name })));
});

const csv = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

R.get('/recipes', ({ user, query }) => {
  const p = profileOf(user.id);
  const list = rankRecipes({
    ingredients: csv(query.get('ingredients')),
    avoid: csv(query.get('avoid')),
    mealType: query.get('meal_type') || undefined,
    diet: query.get('diet') || p.dietary_preference || 'other',
    nutrition: query.get('nutrition') || undefined,
    allergies: p.allergies || [],
    cuisine: ['indian', 'international', 'south'].includes(query.get('cuisine')) ? query.get('cuisine') : undefined,
    maxTime: Number(query.get('max_time')) || undefined,
  });
  const saved = new Set(db.where('saved_recipes', (s) => s.user_id === user.id).map((s) => s.recipe_id));
  return ok(list.map((r) => ({ ...r, is_saved: saved.has(r.id) })), { total: list.length, allergies_excluded: p.allergies || [] });
});

R.get('/recipes/saved', ({ user }) => {
  const list = db.where('saved_recipes', (s) => s.user_id === user.id).sort(sortDesc('created_at'))
    .map((s) => RECIPE_BY_ID[s.recipe_id]).filter(Boolean).map((r) => ({ ...summaryRecipe(r), is_saved: true }));
  const history = db.where('recipe_history', (h) => h.user_id === user.id).sort(sortDesc('created_at'));
  const seen = new Set();
  const recent = [];
  for (const h of history) {
    if (seen.has(h.recipe_id) || !RECIPE_BY_ID[h.recipe_id]) continue;
    seen.add(h.recipe_id);
    recent.push({ ...summaryRecipe(RECIPE_BY_ID[h.recipe_id]), last_viewed: h.created_at });
    if (recent.length >= 10) break;
  }
  return ok(list, { history: recent });
});
R.post('/recipes/saved', ({ user, body }) => {
  const id = str(body, 'recipe_id');
  if (!RECIPE_BY_ID[id]) throw notFound('Recipe');
  if (!db.find('saved_recipes', (s) => s.user_id === user.id && s.recipe_id === id)) db.insert('saved_recipes', { user_id: user.id, recipe_id: id });
  return created({ recipe_id: id, is_saved: true });
});
R.delete('/recipes/saved/:recipe_id', ({ user, params }) => {
  db.remove('saved_recipes', (s) => s.user_id === user.id && s.recipe_id === params.recipe_id);
  return noContent();
});
R.get('/recipes/:id', ({ user, params }) => {
  const r = RECIPE_BY_ID[params.id];
  if (!r) throw notFound('Recipe');
  const recentView = db.find('recipe_history', (h) => h.user_id === user.id && h.recipe_id === r.id && h.action === 'viewed' && Date.now() - Date.parse(h.created_at) < 3600_000);
  if (!recentView) db.insert('recipe_history', { user_id: user.id, recipe_id: r.id, action: 'viewed' });
  const p = profileOf(user.id);
  return ok({
    ...summaryRecipe(r), ingredients: r.ingredients, instructions: r.instructions, nutrition: r.nutrition, allergens: r.allergens,
    allergy_warnings: recipeConflicts(r, p.allergies || []),
    is_saved: Boolean(db.find('saved_recipes', (s) => s.user_id === user.id && s.recipe_id === r.id)),
  });
});

// =================== EXERCISES ===================
R.get('/exercises/categories', () => ok(CATEGORIES.map((c) => ({ ...c, count: EXERCISES.filter((e) => e.category === c.id).length }))), { auth: false });
// Real coaching videos for the follow-along players: { exercise_id: { url, by } }
R.get('/exercises/videos', () => ok(Object.fromEntries(EXERCISES.filter((e) => e.video_url).map((e) => [e.id, { url: e.video_url, by: e.video_by }]))), { auth: false });
R.get('/exercises', ({ query }) => {
  const cat = query.get('category');
  const diff = query.get('difficulty');
  const equip = query.get('equipment');
  const goal = query.get('goal');
  const maxMin = Number(query.get('max_duration')) || null;
  const q = (query.get('q') || '').toLowerCase();
  const list = EXERCISES.filter((e) => (!cat || e.category === cat)
    && (!diff || e.difficulty === diff)
    && (!equip || (equip === 'none' ? e.equipment.every((x) => x === 'none') : equip === 'mat' ? ['core', 'yoga', 'stretching', 'mobility', 'kegel_pelvic', 'cooldown', 'recovery'].includes(e.category) : e.equipment.includes(equip)))
    && (!goal || e.goals.includes(goal))
    && (!maxMin || estimateMinutes(e) <= maxMin)
    && (!q || e.name.toLowerCase().includes(q) || e.target_muscles.join(' ').includes(q)))
    .map((e) => ({ ...e, est_minutes: estimateMinutes(e) }));
  const category = CATEGORIES.find((c) => c.id === cat);
  return ok(list, {
    total: list.length,
    disclaimer: category?.spot_disclaimer ? SPOT_REDUCTION_DISCLAIMER : null,
    kegel_safety: category?.kegel ? KEGEL_SAFETY : null,
    dr_safety: category?.dr ? DR_SAFETY : null,
    dr_program: category?.dr ? DR_PROGRAM : null,
  });
}, { auth: false });
R.get('/exercises/:id', ({ params }) => {
  const e = EXERCISE_BY_ID[params.id];
  if (!e) throw notFound('Exercise');
  const cat = CATEGORIES.find((c) => c.id === e.category);
  return ok({ ...e, est_minutes: estimateMinutes(e), category_name: cat?.name, icon: cat?.icon, disclaimer: cat?.spot_disclaimer ? SPOT_REDUCTION_DISCLAIMER : null, kegel_safety: cat?.kegel ? KEGEL_SAFETY : null, dr_safety: cat?.dr ? DR_SAFETY : null, dr_program: cat?.dr ? DR_PROGRAM : null });
}, { auth: false });

// =================== WORKOUT PLANNER ===================
async function generatePlan(user, body, preferAi) {
  const p = profileOf(user.id);
  const goal = body.goal ? str(body, 'goal', { oneOf: ENUMS.fitness_goal }) : p.fitness_goal || 'general_wellness';
  const level = body.level ? str(body, 'level', { oneOf: ENUMS.exercise_intensity }) : p.exercise_intensity || 'beginner';
  const duration = num(body, 'duration_min', { min: 10, max: 45, int: true, required: false }) || 20;
  if (![10, 15, 20, 30, 45].includes(duration)) throw badRequest('duration_min must be 10, 15, 20, 30 or 45');
  const equipment = Array.isArray(body.equipment) ? body.equipment.map(String).slice(0, 10) : [];
  const lowImpact = Boolean(body.low_impact);
  const category = body.category ? str(body, 'category', { oneOf: CATEGORIES.map((c) => c.id) }) : null;
  let plan;
  try { plan = generateWorkoutPlan({ userId: user.id, goal, level, duration, equipment, lowImpact, category }); }
  catch (e) { if (e.code === 'NO_MATCH') throw badRequest(e.message); throw e; }
  let source = 'rule_based';
  if (preferAi && !category && checkAiQuota(user.id, 'workout_plan')) {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const have = new Set(['none', ...equipment]);
    const catalog = EXERCISES.filter((e) => !['kegel_pelvic', 'facial'].includes(e.category) && e.equipment.every((q) => have.has(q))
      && levels.indexOf(e.difficulty) <= levels.indexOf(level) + 1 && (!lowImpact || e.impact === 'low'))
      .map((e) => ({ id: e.id, name: e.name, category: e.category, difficulty: e.difficulty, est: estimateMinutes(e) }));
    const pickRes = await aiWorkoutPick(user.id, plan, catalog);
    if (pickRes) {
      const okPhase = { warmup: ['warmup'], cooldown: ['cooldown', 'stretching'] };
      const rows = [];
      for (const phase of ['warmup', 'main', 'cooldown']) {
        for (const id of pickRes[phase]) {
          const e = EXERCISE_BY_ID[id];
          if (okPhase[phase] && !okPhase[phase].includes(e.category)) continue;
          rows.push({ exercise_id: e.id, name: e.name, category: e.category, difficulty: e.difficulty, phase, order_index: rows.length, sets: e.sets, reps: e.reps, duration_min: e.duration_min, rest_seconds: e.rest_seconds, est_minutes: estimateMinutes(e), impact: e.impact });
        }
      }
      if (rows.some((r) => r.phase === 'warmup') && rows.some((r) => r.phase === 'cooldown') && rows.filter((r) => r.phase === 'main').length >= 2) {
        plan.exercises = rows;
        plan.est_total_minutes = rows.reduce((s, x) => s + x.est_minutes, 0);
        if (pickRes.note) plan.notes.unshift(pickRes.note);
        source = 'ai';
      }
    }
  }
  for (const pl of db.where('workout_plans', (x) => x.user_id === user.id && x.is_active)) db.update('workout_plans', pl.id, { is_active: false });
  return db.insert('workout_plans', { user_id: user.id, ...plan, source, is_active: true });
}

R.post('/workout-plans/generate', async ({ user, body }) => created(await generatePlan(user, body, Boolean(body.use_ai))));
R.get('/workout-plans', ({ user }) => ok(db.where('workout_plans', (x) => x.user_id === user.id).sort(sortDesc('created_at')).slice(0, 30)));
R.get('/workout-plans/:id', ({ user, params }) => ok(own('workout_plans', params.id, user)));
R.patch('/workout-plans/:id', ({ user, params, body }) => {
  own('workout_plans', params.id, user);
  if (body.is_active) for (const pl of db.where('workout_plans', (x) => x.user_id === user.id && x.is_active)) db.update('workout_plans', pl.id, { is_active: false });
  const patch = {};
  if ('is_active' in body) patch.is_active = Boolean(body.is_active);
  if ('name' in body) patch.name = str(body, 'name', { max: 100 });
  return ok(db.update('workout_plans', params.id, patch));
});
R.delete('/workout-plans/:id', ({ user, params }) => { own('workout_plans', params.id, user); db.remove('workout_plans', (r) => r.id === params.id); return noContent(); });
R.post('/workout-plans/:id/exercises', ({ user, params, body }) => {
  const plan = own('workout_plans', params.id, user);
  const e = EXERCISE_BY_ID[str(body, 'exercise_id')];
  if (!e) throw notFound('Exercise');
  const coolIdx = plan.exercises.findIndex((x) => x.phase === 'cooldown');
  const row = { exercise_id: e.id, name: e.name, category: e.category, difficulty: e.difficulty, phase: 'main', sets: e.sets, reps: e.reps, duration_min: e.duration_min, rest_seconds: e.rest_seconds, est_minutes: estimateMinutes(e), impact: e.impact };
  const list = [...plan.exercises];
  list.splice(coolIdx === -1 ? list.length : coolIdx, 0, row);
  list.forEach((x, i) => { x.order_index = i; });
  return ok(db.update('workout_plans', plan.id, { exercises: list, est_total_minutes: list.reduce((s, x) => s + x.est_minutes, 0) }));
});

R.post('/workout-plans/custom', ({ user, body }) => {
  const name = str(body, 'name', { max: 100 });
  const e = body.exercise_id ? EXERCISE_BY_ID[body.exercise_id] : null;
  const warm = EXERCISE_BY_ID['warmup-march'];
  const cool = EXERCISE_BY_ID['hamstring-stretch'];
  const rows = [warm, ...(e ? [e] : []), cool].map((x, i) => ({ exercise_id: x.id, name: x.name, category: x.category, difficulty: x.difficulty, phase: i === 0 ? 'warmup' : x === cool ? 'cooldown' : 'main', order_index: i, sets: x.sets, reps: x.reps, duration_min: x.duration_min, rest_seconds: x.rest_seconds, est_minutes: estimateMinutes(x), impact: x.impact }));
  for (const pl of db.where('workout_plans', (x) => x.user_id === user.id && x.is_active)) db.update('workout_plans', pl.id, { is_active: false });
  return created(db.insert('workout_plans', { user_id: user.id, name, fitness_goal: profileOf(user.id).fitness_goal || 'general_wellness', fitness_level: profileOf(user.id).exercise_intensity || 'beginner', duration_min: rows.reduce((s, x) => s + x.est_minutes, 0), exercises: rows, notes: [], source: 'custom', is_active: true, est_total_minutes: rows.reduce((s, x) => s + x.est_minutes, 0) }));
});

// ---- Ready-made workouts (public) & guided play ----
R.get('/workouts/ready', ({ query }) => {
  const level = WORKOUT_LEVELS.includes(query.get('level')) ? query.get('level') : 'beginner';
  return ok(readyWorkoutList(level), { level });
}, { auth: false });
R.get('/workouts/ready/:id', ({ params }) => {
  const w = readyWorkout(params.id);
  if (!w) throw notFound('Workout');
  return ok(w);
}, { auth: false });
R.get('/workouts/intervals', () => ok(intervalOptions()), { auth: false });
R.get('/workouts/interval/:id', ({ params }) => {
  const w = intervalWorkout(params.id);
  if (!w) throw notFound('Workout');
  return ok(w);
}, { auth: false });
// ---- Diastasis recti follow-along workouts ----
R.get('/workouts/dr', () => ok(drWorkoutList()), { auth: false });
R.get('/workouts/pf', () => ok(drWorkoutList('pf')), { auth: false });
R.get('/workouts/dr/:id', ({ params }) => {
  const w = drWorkout(params.id);
  if (!w) throw notFound('Workout');
  return ok(w);
}, { auth: false });
// ---- 14-Day challenge ----
R.get('/challenge', ({ query }) => {
  const level = WORKOUT_LEVELS.includes(query.get('level')) ? query.get('level') : 'beginner';
  return ok(challengePlan(level, query.get('low_impact') === 'true'));
}, { auth: false });
R.get('/workouts/challenge/:id', ({ params }) => {
  const w = challengeWorkout(params.id);
  if (!w) throw notFound('Workout');
  return ok(w);
}, { auth: false });
R.get('/challenge/progress', ({ user }) => {
  const p = profileOf(user.id);
  return ok({ ...challengeProgress(db.where('workout_sessions', (s) => s.user_id === user.id), p.challenge_started_at), started_at: p.challenge_started_at || null });
});
R.post('/challenge/restart', ({ user }) => {
  const p = profileOf(user.id);
  db.update('profiles', p.id, { challenge_started_at: nowIso() });
  return ok(challengeProgress([], null));
});
R.get('/workout-plans/:id/guided', ({ user, params }) => {
  const plan = own('workout_plans', params.id, user);
  return ok({
    id: `plan-${plan.id}`, plan_id: plan.id, title: plan.name, emoji: '📋', blurb: 'Your personal workout plan', duration_min: plan.duration_min, level: plan.fitness_level,
    rounds: plan.rounds || 1, notes: plan.notes || [], est_total_minutes: plan.est_total_minutes, interval: Boolean(plan.interval), round_rest: plan.round_rest || 0,
    exercises: plan.exercises.map((x) => { const e = EXERCISE_BY_ID[x.exercise_id]; return { ...x, category: x.category || e?.category, target_muscles: e?.target_muscles || [], equipment: e?.equipment || ['none'], safety_notes: e?.safety_notes || '', instructions: e?.instructions || [] }; }),
  });
});
R.post('/workout-plans/from-ready', ({ user, body }) => {
  const wid = str(body, 'workout_id');
  const w = wid.startsWith('iv-') ? intervalWorkout(wid) : wid.startsWith('ch-') ? challengeWorkout(wid) : wid.startsWith('drw-') ? drWorkout(wid) : readyWorkout(wid);
  if (!w) throw notFound('Workout');
  for (const pl of db.where('workout_plans', (x) => x.user_id === user.id && x.is_active)) db.update('workout_plans', pl.id, { is_active: false });
  const exercises = w.exercises.map(({ target_muscles: _t, equipment: _e, safety_notes: _s, instructions: _i, ...row }) => row);
  return created(db.insert('workout_plans', {
    user_id: user.id, name: `${w.emoji} ${w.title} · ${w.duration_min} min`, fitness_goal: profileOf(user.id).fitness_goal || 'general_wellness', fitness_level: w.level,
    duration_min: w.duration_min, exercises, notes: w.notes, rounds: w.rounds, source: 'ready_made', ready_id: w.id, is_active: true, est_total_minutes: w.est_total_minutes, interval: Boolean(w.interval), round_rest: w.round_rest || 0,
  }));
});
R.post('/workout-sessions/guided', ({ user, body }) => {
  const title = str(body, 'title', { max: 120 });
  const minutes = num(body, 'total_duration_min', { min: 0, max: 600 });
  const list = Array.isArray(body.exercises) ? body.exercises.slice(0, 100) : [];
  const completions = list.map((x) => ({ exercise_id: String(x.exercise_id || ''), name: String(x.name || '').slice(0, 120), phase: ['warmup', 'main', 'cooldown'].includes(x.phase) ? x.phase : 'main', completed: Boolean(x.completed) }));
  const planId = typeof body.plan_id === 'string' && db.find('workout_plans', (p) => p.id === body.plan_id && p.user_id === user.id) ? body.plan_id : null;
  const date = dateField(body, 'date', { required: false }) || localDate();
  return created(db.insert('workout_sessions', {
    user_id: user.id, plan_id: planId, plan_name: title, date, started_at: new Date(Date.now() - minutes * 60000).toISOString(), completed_at: nowIso(),
    total_duration_min: Math.max(1, Math.round(minutes)), notes: body.stopped_early ? 'Stopped early' : '', completions, guided: true,
    calories_burned: body.calories_burned !== undefined ? Math.round(num(body, 'calories_burned', { min: 0, max: 3000 })) : null,
    workout_id: typeof body.workout_id === 'string' ? body.workout_id.slice(0, 80) : null,
    challenge_day: typeof body.workout_id === 'string' && /^ch-\d{1,2}-/.test(body.workout_id) ? Number(body.workout_id.split('-')[1]) : null,
    stopped_early: Boolean(body.stopped_early),
  }));
});

R.get('/workout-sessions', ({ user }) => ok(db.where('workout_sessions', (s) => s.user_id === user.id).sort(sortDesc('started_at')).slice(0, 100)));
R.post('/workout-sessions', ({ user, body }) => {
  const plan = body.plan_id ? own('workout_plans', body.plan_id, user) : null;
  const date = dateField(body, 'date', { required: false }) || localDate();
  return created(db.insert('workout_sessions', {
    user_id: user.id, plan_id: plan?.id || null, plan_name: plan?.name || 'Free workout', date, started_at: nowIso(), completed_at: null, total_duration_min: null, notes: '',
    completions: (plan?.exercises || []).map((x) => ({ exercise_id: x.exercise_id, name: x.name, phase: x.phase, completed: false })),
  }));
});
R.patch('/workout-sessions/:id', ({ user, params, body }) => {
  const s = own('workout_sessions', params.id, user);
  const patch = {};
  if ('notes' in body) patch.notes = str(body, 'notes', { required: false, max: 500 }) || '';
  if (body.complete) {
    patch.completed_at = nowIso();
    patch.total_duration_min = num(body, 'total_duration_min', { min: 0, max: 600, required: false }) ?? Math.max(1, Math.round((Date.now() - Date.parse(s.started_at)) / 60000));
  }
  return ok(db.update('workout_sessions', s.id, patch));
});
R.post('/workout-sessions/:id/complete-exercise', ({ user, params, body }) => {
  const s = own('workout_sessions', params.id, user);
  const id = str(body, 'exercise_id');
  const c = s.completions.find((x) => x.exercise_id === id);
  if (!c) throw notFound('Exercise in this session');
  c.completed = body.completed !== false;
  db.touch();
  return ok(s);
});
R.delete('/workout-sessions/:id', ({ user, params }) => { own('workout_sessions', params.id, user); db.remove('workout_sessions', (r) => r.id === params.id); return noContent(); });

// =================== PROGRESS ===================
function progressSeries(userId, days, end) {
  return dateRange(end, days).map((d) => {
    const s = dailySummary(userId, d);
    const w = db.find('weight_records', (r) => r.user_id === userId && r.recorded_date === d);
    return {
      date: d, weight_kg: w?.weight_kg ?? null, steps: s.steps.count || null, water_ml: s.water.total_ml || null,
      sleep_minutes: s.sleep?.duration_minutes ?? null, meals: s.meals.count, calories_est: s.meals.nutrition.calories || null,
      workouts: s.workouts.completed, workout_minutes: s.workouts.minutes || null, habit_pct: s.habit_completion_pct,
    };
  });
}
const avgOf = (arr) => { const v = arr.filter((x) => x !== null && x !== undefined); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };

R.get('/progress/summary', ({ user, query }) => {
  const days = Math.min(365, Math.max(7, Number(query.get('days')) || 30));
  const end = qDate(query, 'end');
  const series = progressSeries(user.id, days, end);
  const plans = db.where('workout_sessions', (s) => s.user_id === user.id && s.date >= series[0].date && s.date <= end);
  const totalEx = plans.reduce((s, x) => s + x.completions.length, 0);
  const doneEx = plans.reduce((s, x) => s + x.completions.filter((c) => c.completed).length, 0);
  const cooked = {};
  for (const h of db.where('recipe_history', (h) => h.user_id === user.id && h.action === 'cooked')) cooked[h.recipe_id] = (cooked[h.recipe_id] || 0) + 1;
  const weights = series.filter((x) => x.weight_kg !== null);
  return ok({
    days, from: series[0].date, to: end, series,
    averages: {
      steps: avgOf(series.map((x) => x.steps)), water_ml: avgOf(series.map((x) => x.water_ml)), sleep_minutes: avgOf(series.map((x) => x.sleep_minutes)),
      calories_est: avgOf(series.map((x) => x.calories_est)), habit_pct: avgOf(series.map((x) => x.habit_pct)),
    },
    consistency: {
      water_days: series.filter((x) => x.water_ml).length, meal_days: series.filter((x) => x.meals).length,
      sleep_days: series.filter((x) => x.sleep_minutes).length, step_days: series.filter((x) => x.steps).length,
    },
    weight_change_kg: weights.length >= 2 ? +(weights[weights.length - 1].weight_kg - weights[0].weight_kg).toFixed(1) : null,
    workouts: { sessions: plans.filter((x) => x.completed_at).length, exercise_completion_pct: totalEx ? Math.round((doneEx / totalEx) * 100) : null, minutes: plans.reduce((s, x) => s + (x.total_duration_min || 0), 0) },
    top_recipes: Object.entries(cooked).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ id, name: RECIPE_BY_ID[id]?.name, times: n })),
  });
});

R.get('/progress/habits', ({ user, query }) => {
  const s = streaks(user.id, qDate(query));
  const milestones = [];
  const labels = { steps: 'step logging', water: 'water logging', meals: 'meal logging', sleep: 'sleep logging', weight: 'weight logging', workout: 'workouts' };
  for (const [k, v] of Object.entries(s)) {
    for (const m of [3, 7, 14, 30, 60, 100]) if (v.longest >= m) milestones.push({ habit: k, label: `${m}-day ${labels[k]} streak`, days: m });
  }
  const best = {};
  for (const m of milestones) if (!best[m.habit] || best[m.habit].days < m.days) best[m.habit] = m;
  const list = Object.values(best).map((m) => ({ ...m, icon: '🏅' }));
  const firstBy = (c, pred, dateField) => db.where(c, (r) => r.user_id === user.id && pred(r)).map((r) => r[dateField]).sort()[0];
  const tenK = firstBy('step_records', (r) => r.step_count >= 10000, 'recorded_date');
  if (tenK) list.unshift({ habit: 'steps', label: 'First 10,000-step day!', date: tenK, icon: '🏅' });
  const firstWorkout = firstBy('workout_sessions', (r) => r.completed_at, 'date');
  if (firstWorkout) list.push({ habit: 'workout', label: 'First workout completed', date: firstWorkout, icon: '💪' });
  const waterGoal = profileOf(user.id).water_goal_ml || 2500;
  const totals = {};
  for (const e of db.where('water_entries', (r) => r.user_id === user.id)) totals[e.date] = (totals[e.date] || 0) + e.amount_ml;
  const firstWater = Object.keys(totals).filter((d) => totals[d] >= waterGoal).sort()[0];
  if (firstWater) list.push({ habit: 'water', label: 'First day hitting your water goal', date: firstWater, icon: '💧' });
  const p = profileOf(user.id);
  const cw = currentWeightKg(user.id);
  if (p.height_cm && cw) {
    const b = calculateBmi(p.height_cm, cw, p.age);
    if (b.category) list.push({ habit: 'bmi', label: b.category === 'healthy_weight' ? 'BMI in the healthy range ✅' : 'BMI goal: reach the healthy range', status: `BMI ${b.bmi}`, icon: '🎯' });
  }
  return ok({ streaks: s, milestones: list });
});

R.get('/progress/insights', ({ user, query }) => {
  const end = qDate(query, 'end');
  const series = progressSeries(user.id, 7, end);
  const p = profileOf(user.id);
  const insights = [];
  const steps = avgOf(series.map((x) => x.steps));
  const water = avgOf(series.map((x) => x.water_ml));
  const sleep = avgOf(series.map((x) => x.sleep_minutes));
  const mealDays = series.filter((x) => x.meals).length;
  const workouts = series.reduce((s, x) => s + x.workouts, 0);
  if (steps === null) insights.push({ type: 'steps', tone: 'tip', text: 'Log your steps for a few days to see your activity trend.' });
  else if (steps >= (p.step_goal || 8000)) insights.push({ type: 'steps', tone: 'positive', text: `Great work — you averaged ${steps.toLocaleString()} steps on logged days, meeting your goal.` });
  else insights.push({ type: 'steps', tone: 'tip', text: `You averaged ${steps.toLocaleString()} steps. A 10-minute walk after a meal adds roughly 1,000 steps for many people.` });
  if (water === null) insights.push({ type: 'water', tone: 'tip', text: 'Try logging water with the quick-add buttons — even a few entries a day helps you notice patterns.' });
  else if (water < (p.water_goal_ml || 2500) * 0.8) insights.push({ type: 'water', tone: 'tip', text: `Your water intake averaged ${water} ml. Keeping a bottle nearby may help you get closer to your ${p.water_goal_ml || 2500} ml goal.` });
  else insights.push({ type: 'water', tone: 'positive', text: `Nice hydration — about ${water} ml per day on logged days.` });
  if (sleep !== null) {
    if (sleep < 420) insights.push({ type: 'sleep', tone: 'tip', text: `You averaged ${Math.floor(sleep / 60)}h ${sleep % 60}m of sleep. Most adults are advised to aim for 7–9 hours; a consistent bedtime may help.` });
    else insights.push({ type: 'sleep', tone: 'positive', text: `You averaged ${Math.floor(sleep / 60)}h ${sleep % 60}m of sleep — within the commonly recommended range.` });
  }
  insights.push(mealDays >= 5
    ? { type: 'meals', tone: 'positive', text: `You logged meals on ${mealDays} of the last 7 days. Consistent logging makes your nutrition estimates more useful.` }
    : { type: 'meals', tone: 'tip', text: `Meals were logged on ${mealDays} of 7 days. Logging even one meal a day builds the habit.` });
  insights.push(workouts >= 3
    ? { type: 'workout', tone: 'positive', text: `${workouts} workouts completed this week — remember rest days help recovery too.` }
    : { type: 'workout', tone: 'tip', text: workouts ? `${workouts} workout${workouts > 1 ? 's' : ''} this week. Short 10–15 minute sessions count!` : 'No workouts logged this week. The Workout Planner can build a 10-minute routine to get started.' });
  return ok(insights, { source: 'template' });
});

// =================== REMINDERS & NOTIFICATIONS ===================
R.get('/reminders', ({ user }) => ok(db.where('reminders', (r) => r.user_id === user.id).sort((a, b) => (a.scheduled_time > b.scheduled_time ? 1 : -1))));
R.post('/reminders', ({ user, body }) => created(db.insert('reminders', {
  user_id: user.id,
  reminder_type: str(body, 'reminder_type', { oneOf: ENUMS.reminder_type }),
  scheduled_time: timeField(body, 'scheduled_time'),
  frequency: str(body, 'frequency', { required: false, oneOf: ENUMS.frequency }) || 'daily',
  is_enabled: body.is_enabled !== false,
  label: str(body, 'label', { required: false, max: 100 }) || '',
})));
R.patch('/reminders/:id', ({ user, params, body }) => {
  own('reminders', params.id, user);
  const patch = {};
  if ('scheduled_time' in body) patch.scheduled_time = timeField(body, 'scheduled_time');
  if ('frequency' in body) patch.frequency = str(body, 'frequency', { oneOf: ENUMS.frequency });
  if ('is_enabled' in body) patch.is_enabled = Boolean(body.is_enabled);
  if ('label' in body) patch.label = str(body, 'label', { required: false, max: 100 }) || '';
  return ok(db.update('reminders', params.id, patch));
});
R.delete('/reminders/:id', ({ user, params }) => { own('reminders', params.id, user); db.remove('reminders', (r) => r.id === params.id); return noContent(); });

R.get('/notifications', ({ user }) => {
  const list = db.where('notifications', (n) => n.user_id === user.id).sort(sortDesc('created_at')).slice(0, 50);
  return ok(list, { unread: list.filter((n) => !n.is_read).length });
});
R.post('/notifications', ({ user, body }) => created(db.insert('notifications', { user_id: user.id, title: str(body, 'title', { max: 120 }), body: str(body, 'body', { required: false, max: 500 }) || '', is_read: false })));
R.patch('/notifications/:id/read', ({ user, params }) => { own('notifications', params.id, user); return ok(db.update('notifications', params.id, { is_read: true })); });
R.post('/notifications/read-all', ({ user }) => {
  for (const n of db.where('notifications', (x) => x.user_id === user.id && !x.is_read)) n.is_read = true;
  db.touch();
  return ok({ ok: true });
});

// =================== AI ===================
R.get('/ai/status', () => ok(aiStatus()));
R.get('/settings/ai', () => ok({ ...aiStatus(), key_hint: config.anthropicKey ? `…${config.anthropicKey.slice(-4)}` : null }));
R.put('/settings/ai', async ({ body }) => {
  const key = str(body, 'api_key', { max: 300 }).replace(/\s+/g, '');
  if (!/^sk-ant-/.test(key)) throw badRequest('Anthropic API keys start with "sk-ant-". Please paste the full key.');
  const result = await testAiKey(key, typeof body.model === 'string' ? body.model : undefined);
  if (!result.ok) throw badRequest(result.error);
  saveAiSettings({ key, model: result.model });
  return ok({ ...aiStatus(), key_hint: `…${key.slice(-4)}`, message: `Connected — the AI coach is now using ${result.model}.` });
});
R.delete('/settings/ai', () => { saveAiSettings({ key: '' }); return ok(aiStatus()); });

R.get('/ai/conversations/latest', ({ user }) => {
  const conv = db.where('ai_conversations', (c) => c.user_id === user.id).sort(sortDesc('created_at'))[0];
  return ok(conv ? { id: conv.id, messages: conv.messages } : null, { greeting: GREETING });
});

R.post('/ai/chat', async ({ user, body, res }) => {
  const message = str(body, 'message', { max: 2000 });
  let conv = body.conversation_id ? db.find('ai_conversations', (c) => c.id === body.conversation_id && c.user_id === user.id) : null;
  if (!conv) conv = db.insert('ai_conversations', { user_id: user.id, messages: [{ role: 'assistant', content: GREETING, created_at: nowIso() }] });

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Content-Type-Options': 'nosniff' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const history = conv.messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  conv.messages.push({ role: 'user', content: message, created_at: nowIso() });

  const emergency = detectEmergency(message);
  let result;
  if (emergency) {
    const text = emergencyResponse(emergency);
    send('token', { text });
    result = { text, source: 'emergency' };
  } else if (!checkAiQuota(user.id, 'chat')) {
    const text = "You've reached today's AI message limit. Your quota resets tomorrow — in the meantime, the trackers, recipes and workout planner all work as usual.";
    send('token', { text });
    result = { text, source: 'limit' };
  } else {
    // history starts with the greeting (assistant); Claude requires the first turn to be the user.
    const apiHistory = history[0]?.role === 'assistant' ? history.slice(1) : history;
    result = await chatReply({ userId: user.id, history: apiHistory, message, onText: (t) => send('token', { text: t }) });
  }
  const messageId = crypto.randomUUID();
  conv.messages.push({ id: messageId, role: 'assistant', content: result.text, source: result.source, created_at: nowIso() });
  if (conv.messages.length > 200) conv.messages = conv.messages.slice(-200);
  db.touch();
  send('done', { conversation_id: conv.id, message_id: messageId, source: result.source });
  res.end();
  return { handled: true };
});

R.post('/ai/conversations/new', ({ user }) => created({ id: db.insert('ai_conversations', { user_id: user.id, messages: [{ role: 'assistant', content: GREETING, created_at: nowIso() }] }).id, greeting: GREETING }));

R.post('/ai/meal-plan', async ({ user, body }) => {
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients.map(String).slice(0, 30) : [];
  const cuisine = ['indian', 'international', 'mixed'].includes(body.cuisine) ? body.cuisine : 'mixed';
  return ok(await mealPlan(user.id, { ingredients, cuisine }));
});
R.post('/ai/workout-plan', async ({ user, body }) => created(await generatePlan(user, body, true)));
R.post('/ai/recipe-suggestions', ({ user, body }) => {
  const p = profileOf(user.id);
  const list = rankRecipes({ ingredients: Array.isArray(body.ingredients) ? body.ingredients : [], diet: p.dietary_preference, allergies: p.allergies || [], mealType: body.meal_type });
  return ok(list.slice(0, 10), { source: 'rule_based' });
});
R.post('/ai/feedback', ({ user, body }) => created(db.insert('ai_feedback', {
  user_id: user.id, rating: str(body, 'rating', { oneOf: ['up', 'down'] }), context: str(body, 'context', { required: false, max: 120 }) || 'chat', comment: str(body, 'comment', { required: false, max: 1000 }) || '',
})));

export { sendJson };
