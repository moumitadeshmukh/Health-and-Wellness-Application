// Tiara (ai-spec): Claude API when ANTHROPIC_API_KEY is set, otherwise rule-based fallback.
import crypto from 'node:crypto';
import { config, aiEnabled } from './config.js';
import { db } from './db.js';
import { profileOf, currentWeightKg, calculateBmi, dateRange, localDate, dailySummary, rankRecipes, BMI_DISCLAIMER } from './logic.js';
import { RECIPES, RECIPE_BY_ID } from './data/recipes.js';
import { coachReply } from './coach.js';
import { KEGEL_SAFETY } from './data/exercises.js';

export const PROMPT_VERSION = 'wellnessbot-v1';

export const GREETING =
  "Hi! I'm Tiara, your AI wellness assistant. I can provide general health and wellness information, but I'm not a healthcare professional and cannot diagnose conditions or prescribe treatments. For medical emergencies, please contact emergency services immediately. How can I help you today?";

const EMERGENCY = {
  cardiac: ['chest pain', 'heart attack', "can't breathe", 'cant breathe', 'cannot breathe', 'shortness of breath', 'palpitations'],
  neuro: ['stroke', 'sudden headache', "can't speak", 'cant speak', 'facial drooping', 'face drooping', 'arm weakness'],
  allergy: ['severe allergic reaction', 'anaphylaxis', 'throat swelling', "can't swallow", 'cant swallow'],
  self_harm: ['self-harm', 'self harm', 'hurt myself', 'want to die', 'suicide', 'suicidal', 'end my life', 'kill myself', 'self-inflicted'],
  overdose: ['overdose', 'took too many pills', 'poisoning', 'poisoned'],
  trauma: ['unconscious', 'not breathing', 'severe bleeding'],
};

export function detectEmergency(text) {
  const t = String(text).toLowerCase();
  for (const [category, words] of Object.entries(EMERGENCY)) {
    if (words.some((w) => t.includes(w))) return category;
  }
  return null;
}

export function emergencyResponse(category) {
  let msg = `⚠️ This sounds like it may be a medical emergency.

Please do not wait for an AI response. Take action immediately:

🆘 Emergency Services: Call 112 (India) or your local emergency number
🏥 Go to your nearest hospital emergency department
📞 Call a trusted person who can help you right now`;
  if (category === 'self_harm') {
    msg += `
💬 Tele-MANAS (India, free, 24/7 mental health support): 14416 or 1-800-891-4416`;
  }
  msg += `

Tiara is not equipped to handle emergencies. Please seek immediate professional help.`;
  return msg;
}

// ---------- context (data-minimised; no email, full name or raw logs) ----------
export function buildContext(userId, scope = 'all') {
  const p = profileOf(userId);
  const today = localDate();
  const days = dateRange(today, 7).map((d) => dailySummary(userId, d));
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  const stepsDays = days.filter((d) => d.steps.count > 0);
  const waterDays = days.filter((d) => d.water.total_ml > 0);
  const sleepDays = days.filter((d) => d.sleep);
  const weight = currentWeightKg(userId);
  const bmi = p.height_cm && weight ? calculateBmi(p.height_cm, weight, p.age) : null;
  const lines = [
    'User profile summary:',
    `- First name: ${(p.name || '').split(' ')[0] || 'not set'}`,
    `- Age: ${p.age ?? '?'} | Gender: ${p.gender || 'not specified'} | Height: ${p.height_cm ?? '?'} cm | Weight: ${weight ?? '?'} kg`,
    `- Activity level: ${p.activity_level || '?'}`,
    `- Fitness goal: ${p.fitness_goal || '?'}`,
    `- Dietary preference: ${p.dietary_preference || '?'}`,
    `- Allergies / restrictions: ${(p.allergies || []).join(', ') || 'none recorded'}`,
    `- Exercise intensity: ${p.exercise_intensity || '?'}`,
  ];
  if (scope !== 'workout') {
    lines.push(
      '', 'Recent health data (last 7 days):',
      `- Average daily steps: ${avg(stepsDays.map((d) => d.steps.count)) ?? 'no data'} (goal ${p.step_goal || 8000})`,
      `- Average water intake: ${avg(waterDays.map((d) => d.water.total_ml)) ?? 'no data'} ml/day (goal ${p.water_goal_ml || 2500})`,
      `- Average sleep duration: ${avg(sleepDays.map((d) => d.sleep.duration_minutes)) ?? 'no data'} min/night`,
      `- Days with meals logged: ${days.filter((d) => d.meals.count).length}/7`,
      `- Workouts completed: ${days.reduce((s, d) => s + d.workouts.completed, 0)}`,
      `- Latest weight: ${weight ?? 'not recorded'} kg`,
      `- BMI: ${bmi ? `${bmi.bmi} (${bmi.category || 'adult categories not applicable'})` : 'unknown'}`,
      `- Habit completion rate: ${avg(days.map((d) => d.habit_completion_pct))}%`,
    );
  }
  return { text: lines.join('\n'), profile: p, days, bmi, weight };
}

function systemPrompt(ctx) {
  const p = ctx.profile;
  return `You are Tiara, an empathetic wellness information specialist for WellnessApp.

IDENTITY AND ROLE:
- You provide general health, nutrition, fitness, and wellness information.
- You are NOT a doctor, nurse, or licensed healthcare professional.
- You CANNOT diagnose conditions, prescribe treatments, or replace medical advice.

USER CONTEXT:
${ctx.text}

CORE RULES:
1. Always begin every chat session by briefly acknowledging you are an AI wellness assistant, not a healthcare professional.
2. Never diagnose, prescribe, or provide specific medical treatment advice.
3. Never claim that exercises can selectively burn fat from specific body areas (breasts, hips, stomach, face).
4. Never guarantee weight loss, muscle gain, or any specific health outcome.
5. Always respect the user's dietary preference (${p.dietary_preference || 'unknown'}) and allergies (${(p.allergies || []).join(', ') || 'none recorded'}) in all food recommendations.
6. Use hedged language: "research suggests", "many people find", "this may help".
7. Keep responses concise and formatted for mobile (short paragraphs, bullet points). Use simple Markdown (bold, bullet lists, links). When helpful, point to app pages with Markdown links: [Workouts](/workouts), [Healthy snacks](/recipes?meal=snack), [South Indian recipes](/recipes?cuisine=south), [Exercise library](/exercises), [BMI check](/bmi), [Daily tracker](/tracker), [Progress](/progress).
8. If the user asks a question outside your scope (legal, financial, political, etc.), acknowledge it and say: "That's outside my area of expertise as a wellness assistant. I'm best suited for questions about nutrition, fitness, sleep, hydration, and general healthy habits."
9. For BMI responses, always include the limitation disclaimer.
10. For Kegel exercises, always include the pelvic floor safety caution.
11. For weight management, never suggest extreme calorie restriction or rapid weight loss.
12. Do not encourage excessive fasting or restrictive eating patterns.
13. Never give medication names, doses, or advice for users under 13.

FALLBACK:
If you are uncertain or lack sufficient information to answer safely, say so clearly and recommend the user consult a qualified healthcare professional.`;
}

// ---------- Claude API ----------
async function callClaude({ system, messages, maxTokens = 1024, stream = false, signal }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: config.aiModel, max_tokens: maxTokens, system, messages, stream }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res;
}

export async function streamClaude({ system, messages, onText }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.aiTimeoutMs);
  try {
    const res = await callClaude({ system, messages, stream: true, signal: ctrl.signal });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let full = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const event = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        let data;
        try { data = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
        if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
          full += data.delta.text;
          onText(data.delta.text);
        } else if (data.type === 'error') {
          throw new Error(data.error?.message || 'Claude stream error');
        }
      }
    }
    return full;
  } finally {
    clearTimeout(timer);
  }
}

async function claudeJson({ system, prompt, maxTokens = 2000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.aiTimeoutMs);
  try {
    const res = await callClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens, signal: ctrl.signal });
    const body = await res.json();
    const text = (body.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON in AI response');
    return JSON.parse(text.slice(start, end + 1));
  } finally {
    clearTimeout(timer);
  }
}

// ---------- AI usage limit (per user per day) ----------
// Per-user daily limits from the AI spec (chat 50, meal plan 10, workout plan 20, recipe suggestions 30).
export const AI_LIMITS = { chat: config.aiDailyLimit, meal_plan: 10, workout_plan: 20, recipe_suggestions: 30 };
const usage = new Map();
export function checkAiQuota(userId, kind = 'chat') {
  const key = `${userId}:${kind}:${localDate()}`;
  const n = (usage.get(key) || 0) + 1;
  usage.set(key, n);
  return n <= (AI_LIMITS[kind] ?? config.aiDailyLimit);
}

// Identical AI requests are cached for 1 hour (keyed by a hash of the inputs).
const cache = new Map();
const CACHE_MS = 60 * 60 * 1000;
export function cacheKey(...parts) {
  return crypto.createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
export function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) { cache.delete(key); return null; }
  return structuredClone(hit.value);
}
export function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value: structuredClone(value) });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
}

// ---------- rule-based chat fallback (see coach.js) ----------
export function fallbackChat(userId, message, history = []) {
  try { return coachReply(buildContext(userId), message, history); } catch (e) {
    console.error('Coach reply failed:', e);
    return "Sorry, I couldn't put an answer together for that. Try asking in a different way — for example \"healthy snacks\", \"20-minute workout\" or \"how to sleep better\"."; }
}

export async function chatReply({ userId, history, message, onText }) {
  if (!aiEnabled()) {
    const text = fallbackChat(userId, message, history);
    onText(text);
    return { text, source: 'rule_based' };
  }
  const ctx = buildContext(userId);
  const messages = [...history.slice(-10).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: message }];
  try {
    const text = await streamClaude({ system: systemPrompt(ctx), messages, onText });
    return { text, source: 'ai' };
  } catch (e) {
    console.error('AI chat failed, using fallback:', e.message);
    const text = fallbackChat(userId, message, history);
    onText(text);
    return { text, source: 'rule_based', ai_error: true };
  }
}

// ---------- meal plan (F17) ----------
function mealPlanFallback(p, ingredients) {
  const allergies = p.allergies || [];
  const plan = {};
  for (const mt of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const ranked = rankRecipes({ ingredients, mealType: mt, diet: p.dietary_preference, allergies });
    const list = ranked.length ? ranked : rankRecipes({ mealType: mt, diet: p.dietary_preference, allergies });
    const choice = list[Math.floor(Math.random() * Math.min(3, list.length))];
    if (choice) {
      const full = RECIPE_BY_ID[choice.id];
      plan[mt] = {
        name: full.name, recipe_id: full.id, description: full.instructions[0],
        prep_time_min: full.prep_time_min + full.cook_time_min,
        nutrition: { ...full.nutrition },
      };
    }
  }
  return plan;
}

function validMealPlan(plan) {
  if (!plan || typeof plan !== 'object' || !plan.meals) return false;
  return ['breakfast', 'lunch', 'dinner'].every((k) => {
    const m = plan.meals[k];
    return m && typeof m.name === 'string' && m.name.length < 120 && typeof m.description === 'string' && m.nutrition && Number.isFinite(Number(m.nutrition.calories));
  });
}

function allergySafe(plan, allergies) {
  const terms = allergies.map((a) => a.toLowerCase()).filter(Boolean);
  const flagged = [];
  for (const [k, m] of Object.entries(plan)) {
    const blob = `${m.name} ${m.description} ${(m.ingredients || []).join(' ')}`.toLowerCase();
    const hit = terms.find((a) => blob.includes(a));
    if (hit) { flagged.push({ meal: k, allergen: hit }); delete plan[k]; }
  }
  return flagged;
}

export async function mealPlan(userId, { ingredients = [], cuisine = 'mixed' }) {
  const p = profileOf(userId);
  const allergies = p.allergies || [];
  const key = cacheKey('meal', userId, p.dietary_preference, allergies, p.fitness_goal, cuisine, [...ingredients].sort());
  const cached = aiEnabled() ? cacheGet(key) : null;
  if (cached) return cached;
  if (aiEnabled() && checkAiQuota(userId, 'meal_plan')) {
    const ctx = buildContext(userId, 'meal');
    const prompt = `Create a one-day meal plan as JSON only, no prose. Shape:
{"meals":{"breakfast":{"name":"","description":"","ingredients":[""],"prep_time_min":0,"nutrition":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0}},"lunch":{...},"dinner":{...},"snack":{...}},"tips":[""]}
Rules: dietary preference ${p.dietary_preference || 'any'}; NEVER include these allergens: ${allergies.join(', ') || 'none'}; fitness goal ${p.fitness_goal || 'general wellness'}; cuisine ${cuisine}; prefer these available ingredients: ${ingredients.join(', ') || 'any common home ingredients'}. Balanced, realistic Indian home portions; no extreme restriction. Nutrition numbers are estimates per serving.`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = await claudeJson({ system: systemPrompt(ctx), prompt });
        if (!validMealPlan(out)) throw new Error('Meal plan failed validation');
        const meals = {};
        for (const [k, m] of Object.entries(out.meals)) {
          if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(k)) continue;
          meals[k] = {
            name: String(m.name), description: String(m.description), ingredients: (m.ingredients || []).map(String).slice(0, 20),
            prep_time_min: Number(m.prep_time_min) || null,
            nutrition: Object.fromEntries(['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'].map((x) => [x, Math.round(Number(m.nutrition?.[x]) || 0)])),
          };
          meals[k].nutrition.is_estimate = true;
        }
        const flagged = allergySafe(meals, allergies);
        const fb = mealPlanFallback(p, ingredients);
        for (const f of flagged) if (fb[f.meal]) meals[f.meal] = fb[f.meal];
        const result = { source: 'ai', meals, tips: (out.tips || []).map(String).slice(0, 5), allergy_flags: flagged };
        cacheSet(key, result);
        return result;
      } catch (e) {
        console.error(`AI meal plan attempt ${attempt + 1} failed:`, e.message);
      }
    }
  }
  return {
    source: 'rule_based', meals: mealPlanFallback(p, ingredients),
    tips: ['Include a source of protein and vegetables with most meals.', 'Drink water through the day.', 'Adjust portions to your hunger and activity.'],
    allergy_flags: [],
  };
}

// ---------- workout plan via AI (F18) — picks from the library; rule-based fallback ----------
export async function aiWorkoutPick(userId, base, catalog) {
  if (!aiEnabled()) return null;
  const ctx = buildContext(userId, 'workout');
  const prompt = `Choose exercises for a ${base.duration_min}-minute ${base.fitness_level} workout for goal "${base.fitness_goal}"${base.low_impact ? ', low-impact only' : ''}.
Pick ONLY from these exercise ids (id: name, category, difficulty, est minutes):
${catalog.map((e) => `${e.id}: ${e.name}, ${e.category}, ${e.difficulty}, ${e.est}m`).join('\n')}
Return JSON only: {"warmup":["id"],"main":["id"],"cooldown":["id"],"note":"one short encouraging sentence"}. Warm-up must use warmup ids, cool-down must use cooldown/stretching ids. Fit the time.`;
  try {
    const out = await claudeJson({ system: systemPrompt(ctx), prompt, maxTokens: 800 });
    const ids = new Set(catalog.map((e) => e.id));
    const clean = (arr) => (Array.isArray(arr) ? arr.filter((x) => ids.has(x)) : []);
    const res = { warmup: clean(out.warmup), main: clean(out.main), cooldown: clean(out.cooldown), note: typeof out.note === 'string' ? out.note.slice(0, 300) : '' };
    if (!res.warmup.length || res.main.length < 2 || !res.cooldown.length) return null;
    return res;
  } catch (e) {
    console.error('AI workout plan failed, using rule-based plan:', e.message);
    return null;
  }
}

// ---------- set up / test the AI key from Settings ----------
const MODEL_CANDIDATES = ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-latest'];
export async function testAiKey(key, preferred) {
  const models = [...new Set([preferred, config.aiModel, ...MODEL_CANDIDATES].filter(Boolean))];
  let lastError = 'Could not reach the AI service.';
  for (const model of models) {
    let res;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] }),
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) {
      return { ok: false, error: 'Could not connect to the AI service. Check your internet connection and try again.' };
    }
    if (res.ok) return { ok: true, model };
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'That API key was not accepted. Please check you copied the whole key.' };
    if (res.status === 404 || /model/i.test(msg)) { lastError = msg; continue; }
    if (res.status === 429) return { ok: false, error: 'The key works but is rate-limited or out of credit right now. Check your Anthropic account billing.' };
    return { ok: false, error: msg };
  }
  return { ok: false, error: `No supported model was available for this key (${lastError}).` };
}

export function aiStatus() {
  return { enabled: aiEnabled(), model: aiEnabled() ? config.aiModel : null, prompt_version: PROMPT_VERSION };
}

export { RECIPES };
