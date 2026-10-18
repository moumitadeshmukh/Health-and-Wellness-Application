// Built-in Tiara answers (used when no AI key is set, or the AI is unavailable).
// Scores the question against wellness topics, personalises with the user's profile and logs,
// and links to the app's own recipes, workouts and trackers. General information only.
import { rankRecipes, BMI_DISCLAIMER } from './logic.js';
import { readyWorkoutList } from './workouts.js';
import { KEGEL_SAFETY, DR_SAFETY } from './data/exercises.js';
import { RECIPES } from './data/recipes.js';

// Distinctive words from recipe names (e.g. "idli", "poha", "makhana") so "Is poha healthy?" finds the dish.
const GENERIC = new Set(['with', 'and', 'the', 'healthy', 'bowl', 'salad', 'style', 'quick', 'mixed', 'masala', 'vegetable', 'veg', 'curry', 'fry', 'roasted', 'spiced', 'fresh', 'mini', 'easy', 'homemade', 'simple', 'green', 'red', 'chicken', 'paneer', 'egg', 'dal']);
const WORD_COUNT = {};
for (const r of RECIPES) for (const w of new Set(r.name.toLowerCase().match(/[a-z]{3,}/g) || [])) WORD_COUNT[w] = (WORD_COUNT[w] || 0) + 1;
function findDishes(t) {
  const words = new Set(t.match(/[a-z]{3,}/g) || []);
  const hits = RECIPES.map((r) => {
    const nameWords = (r.name.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !GENERIC.has(w) && WORD_COUNT[w] <= 6);
    return { r, n: nameWords.filter((w) => words.has(w) || words.has(`${w}s`)).length };
  }).filter((x) => x.n).sort((a, b) => b.n - a.n);
  return hits.map((x) => x.r);
}

const fmtMin = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;
const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pretty = (s) => String(s || '').replace(/_/g, ' ');

// topic → keyword patterns (each match adds to the score)
const TOPICS = {
  emergencyish: [/chest pain|faint|blood in|can't breathe/],
  greeting: [/^(hi|hello|hey|namaste|good (morning|evening|afternoon))\b/, /^thank|thanks|thank you/],
  bmi: [/\bbmi\b/, /body mass/, /healthy weight|ideal weight|am i (over|under)weight/],
  bellyfat: [/belly|tummy|stomach fat|abdominal fat|love handle|face fat|thigh fat|arm fat|spot reduc/],
  weightloss: [/lose weight|weight loss|losing weight|fat loss|reduce weight|slim|burn fat|lose \d+ ?kg/],
  weightgain: [/gain weight|weight gain|underweight|bulk|put on weight/],
  calories: [/calorie|kcal|how much (should|to) eat|portion/],
  breakfast: [/breakfast|morning meal/],
  lunchdinner: [/lunch|dinner|supper/],
  snack: [/snack|evening hunger|munch|craving/],
  protein: [/protein/],
  southindian: [/south indian|idli|dosa|upma|pongal|sambar/],
  meal: [/meal|food|eat|diet|recipe|cook|nutrition|vegetarian|vegan/],
  hydration: [/water|hydrat|dehydrat|thirst/],
  sleep: [/sleep|insomnia|can't sleep|bedtime|wake up|tired|fatigue|exhausted/],
  stress: [/stress|anxi|worr|overwhelm|calm|relax|mood|sad|low mood|burn ?out/],
  workout: [/workout|exercise|train|gym|fitness|routine|home workout/],
  core: [/\bcore\b|\babs?\b|plank/],
  cardio: [/cardio|stamina|endurance|run|jog|walk(ing)?|steps/],
  yoga: [/yoga|stretch|flexib|mobility|stiff/],
  diastasis: [/diastasis|ab separation|abdominal separation|mummy tummy|postpartum|post-partum|after (delivery|pregnancy|baby|c-?section|childbirth|giving birth)/, /gap (in|between) (my )?(belly|tummy|stomach|abs|abdomen|stomach muscles)|(had|have|delivered) (a |my )?bab(y|ies)|c-?section|separated (abs|stomach)/],
  pregnancy: [/pregnan|expecting|trimester/],
  kegel: [/kegel|pelvic|leak|incontinen/],
  pain: [/back pain|knee pain|joint pain|neck pain|shoulder pain|injur|hurts?\b|sore/],
  condition: [/diabet|sugar level|blood sugar|thyroid|pcos|pcod|blood pressure|hypertension|cholesterol|heart disease/],
  symptoms: [/symptom|unwell|sick|fever|cough|cold|headache|vomit|dizzy|nausea|diagnos/],
  medication: [/medicine|medication|tablet|pill|dose|dosage|supplement|vitamin/],
  progress: [/my week|progress|summary|review|how am i doing|how did i do|report/],
  motivation: [/motivat|lazy|consisten|give up|bored|no energy to/],
  offtopic: [/legal|lawyer|stock|invest|crypto|money|politic|election|tax|cricket score|movie/],
};

function scoreTopics(t) {
  const scores = {};
  for (const [topic, pats] of Object.entries(TOPICS)) {
    const s = pats.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0);
    if (s) scores[topic] = s;
  }
  return scores;
}

function pickWorkout(level, opts) {
  const list = readyWorkoutList(['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner');
  const want = (theme, d) => list.find((w) => w.theme === theme && (!d || w.duration_min === d)) || list.find((w) => w.theme === theme);
  return [...new Map(opts.map(([theme, d]) => want(theme, d)).filter(Boolean).map((w) => [w.id, w])).values()];
}
const wLink = (w) => `[${w.emoji} ${w.title} · ${w.duration_min} min](/workouts/${w.id})`;
const rLink = (r) => `[${r.emoji} ${r.name}](/recipes/${r.id}) — ~${r.calories_per_serving} kcal`;

export function coachReply(ctx, message, history = []) {
  const p = ctx.profile;
  const first = (p.name || '').split(' ')[0];
  let t = message.toLowerCase().trim();
  // Follow-ups like "more", "another one", "what else?" reuse the previous question's topic
  const followUp = /^(more|another|other|what else|any other|something else|next|show more|give me more)\b/.test(t) || t.length < 12 && /more|else|other/.test(t);
  let variant = 0;
  if (followUp) {
    const prev = [...history].reverse().find((m) => m.role === 'user' && m.content.toLowerCase().trim() !== t);
    if (prev) { t = `${prev.content.toLowerCase()} ${t}`; variant = history.filter((m) => m.role === 'user').length; }
  }
  const sc = scoreTopics(t);
  const has = (k) => Boolean(sc[k]);
  const level = p.exercise_intensity || 'beginner';
  const diet = p.dietary_preference || 'other';
  const allergies = p.allergies || [];
  const days = ctx.days;
  const minutesAsked = Number((t.match(/\b(10|15|20|30|45)\s*(min|minute)/) || [])[1]) || null;
  const durationFor = (d) => (d ? (d <= 20 ? 20 : d <= 30 ? 30 : 45) : null);
  const recipes = (opts) => rankRecipes({ diet, allergies, ...opts });
  const rotate = (arr, n) => (arr.length ? [...arr.slice(variant % arr.length), ...arr.slice(0, variant % arr.length)].slice(0, n) : []);
  const dietNote = `${pretty(diet) === 'other' ? '' : ` (${pretty(diet)}`}${allergies.length ? `${pretty(diet) === 'other' ? ' (' : ', '}avoiding ${allergies.join(', ')})` : pretty(diet) === 'other' ? '' : ')'}`;
  const out = [];
  const foodQ = /\b(good|healthy|ok|okay|bad|fine|better|unhealthy)\b|can i (eat|have)|should i (eat|have)|calories? (in|of)|how many calories|nutrition (in|of)|protein in/.test(t);
  const dishes = foodQ ? findDishes(t) : [];
  const hello = first ? `${first}, ` : '';

  if (has('offtopic') && Object.keys(sc).length === 1) {
    return "That's outside my area as a wellness assistant. I'm best at nutrition, workouts, sleep, hydration, stress and your logged habits — what would you like help with?";
  }
  if (has('greeting') && Object.keys(sc).length === 1) {
    return /thank/.test(t)
      ? `You're welcome${first ? `, ${first}` : ''}! 😊 Anything else — meals, a workout, sleep or your weekly progress?`
      : `Hello${first ? ` ${first}` : ''}! 👋 I can suggest **meals and snacks**, pick a **workout** for the time you have, explain your **BMI**, help with **sleep or stress**, or **review your week**. What would you like?`;
  }
  if (has('medication')) {
    out.push("I can't advise on medicines, doses or supplements — please ask your doctor or pharmacist, who can check what's safe for you.");
  }
  if (has('symptoms') || has('emergencyish')) {
    out.push(`I'm sorry you're not feeling well${first ? `, ${first}` : ''}. I can't assess symptoms or diagnose — please see a doctor. If symptoms are **severe, sudden or getting worse**, call **112** (India) or go to the nearest hospital.\n\nMeanwhile: rest, sip water regularly, and eat light, simple food if you feel up to it.`);
    if (!has('pain')) return out.join('\n\n');
  }
  if (has('condition')) {
    const cond = (t.match(/diabet|sugar|thyroid|pcos|pcod|blood pressure|hypertension|cholesterol|heart/) || ['your condition'])[0];
    out.push(`For **${cond.replace('pcod', 'PCOS/PCOD').replace('sugar', 'blood sugar')}**, your doctor or a registered dietitian should guide your plan — needs differ a lot between people.\n\nGeneral habits many people find helpful:\n- Regular meals with **fibre and protein** (dal, sprouts, vegetables, whole grains) and fewer refined carbs and sugary drinks\n- **Daily movement** — even a 10–15 minute walk after meals\n- Good **sleep** and **stress** management\n\nTry the [🥗 Healthy snacks](/recipes?meal=snack) and [high-fiber recipes](/recipes) filters.`);
  }
  if (has('pregnancy')) {
    out.push(`Congratulations${first ? `, ${first}` : ''}! During pregnancy, please follow your **doctor's or midwife's advice** before starting or changing exercise. Gentle walking, breathing and pelvic floor work are often recommended, but avoid lying flat on your back for long after the first trimester, high-impact moves and anything that causes pain, bleeding, dizziness or breathlessness.`);
  }
  if (has('diastasis')) {
    const w = pickWorkout('beginner', [['diastasis-recti', 20], ['diastasis-recti', 30]]);
    out.push(`For **diastasis recti** (tummy-muscle separation, common after pregnancy), rebuild in two phases:\n- **Phase 1:** 360° breathing, deep-core (TVA) activation — find it with a small fake cough just inside your hip bones — heel slides, pelvic tilts, 90° heel taps and core-connected bridges\n- **Phase 2** (after about 2–3 weeks, when Phase 1 feels controlled): heel slide & leg lift, core-connected dead bug, modified forearm plank on knees or at an incline\n- Breathe out on the effort; a firm ridge along the middle (hard doming) means make it easier\n- Start 1–2 times a week and build to 3–4; avoid crunches, sit-ups and full planks until a professional clears you\n\nTry the follow-along [🌷 Gentle 12-Min Rehab](/workouts/drw-12-gentle) (start here) or the [🫶 12-Min Ab Rehab](/workouts/drw-12), or ${w.map(wLink).join(' / ')} — or browse the [Diastasis Recti exercises](/exercises?category=diastasis_recti).\n\n_${DR_SAFETY}_`);
  }
  if (has('kegel')) {
    out.push(`Pelvic floor (Kegel) exercises can help strengthen the muscles that support the bladder and pelvic organs. Start lying down, lift gently for 3–5 seconds and **relax fully** for the same time.\n\nTry the follow-along [🌸 Pelvic Floor · 20-Min Workout](/workouts/pfw-20) (22 moves, 45 s each) or the [🌸 pelvic floor exercises](/exercises?category=kegel_pelvic).\n\n_${KEGEL_SAFETY}_`);
  }
  if (has('bmi')) {
    if (!ctx.bmi) out.push(`I don't have your height and weight yet — use the [BMI check](/bmi) to calculate it.\n\n_${BMI_DISCLAIMER}_`);
    else if (!ctx.bmi.category) out.push(ctx.bmi.message);
    else {
      const verdict = { underweight: 'below the healthy range', healthy_weight: 'in the **healthy range** ✅', overweight: 'above the healthy range (overweight)', obesity: 'well above the healthy range (obesity)' }[ctx.bmi.category];
      out.push(`${hello}your BMI is **${ctx.bmi.bmi}**, which is ${verdict}. The healthy weight range for your height is about **${ctx.bmi.healthy_range.min_kg}–${ctx.bmi.healthy_range.max_kg} kg**${ctx.weight ? ` (you're at ${ctx.weight} kg)` : ''}.\n\n_${BMI_DISCLAIMER}_`);
    }
  }
  if (has('bellyfat') && !has('diastasis') && !variant) {
    out.push("Exercises can't burn fat from one specific spot (like the belly or face) — fat loss happens across the whole body through **regular activity, balanced meals and good sleep**. Core exercises still strengthen and tone the muscles underneath, which helps posture and support.");
  }
  if ((has('weightloss') || has('bellyfat')) && !has('diastasis')) {
    const w = pickWorkout(level, [['full-body', durationFor(minutesAsked) || 30], ['low-impact', durationFor(minutesAsked) || 20]]);
    const snacks = rotate(recipes({ mealType: 'snack', nutrition: 'weight_friendly' }), 2);
    out.push(`A sustainable approach many people find works:\n- **Plate:** half vegetables, a quarter protein (dal, paneer, eggs, chicken, tofu), a quarter whole grains\n- **Move daily:** aim for steady steps${ctx.profile.step_goal ? ` (your goal is ${ctx.profile.step_goal.toLocaleString()})` : ''} plus 3–4 workouts a week\n- **Sleep 7–9 hours** and drink water through the day\n- Avoid crash diets, skipping meals or long fasting — about **0.25–1 kg per week** is a commonly recommended pace\n\nWorkouts to start: ${w.map(wLink).join(' · ')}\nSnack ideas: ${snacks.map(rLink).join(' · ')}`);
  }
  if (has('weightgain')) {
    const picks = rotate(recipes({ nutrition: 'high_protein' }), 3);
    out.push(`For healthy weight gain: eat **3 meals + 2–3 snacks**, add protein at each meal, include healthy fats (nuts, seeds, ghee in moderation) and do strength exercises so the gain supports muscle. Ideas: ${picks.map(rLink).join(' · ')}. If you've lost weight without trying, please see a doctor.`);
  }
  if (has('calories') && !dishes.length) {
    out.push("Calorie needs vary with age, size, activity and health, so I won't give you a fixed number — a doctor or dietitian can estimate yours. A simple, practical approach is the **balanced plate** and noticing hunger and fullness. The meal diary in the [Tracker](/tracker/meals) shows estimated calories and protein for what you log.");
  }
  if (dishes.length) {
    const d = dishes[0];
    const n = d.nutrition;
    const notes = [];
    if (n.protein_g >= 10) notes.push('a good source of protein'); else notes.push(`fairly low in protein (${n.protein_g} g) — add dal, sambar, curd, sprouts, an egg or paneer on the side`);
    if (n.fiber_g >= 5) notes.push('high in fibre, which helps you stay full');
    if (n.calories >= 450) notes.push('on the heavier side, so watch the portion');
    if (d.tags.includes('low_added_sugar')) notes.push('low in added sugar');
    const clash = (d.allergens || []).filter((a) => allergies.includes(a));
    out.unshift(`**${d.emoji} ${d.name}** can be part of a healthy ${d.meal_type === 'snack' ? 'snack' : 'diet'}. Per serving it's about **${n.calories} kcal, ${n.protein_g} g protein, ${n.carbs_g} g carbs, ${n.fiber_g} g fibre** (estimates). It's ${notes.join(', ')}.${clash.length ? `\n\n⚠️ It contains **${clash.join(', ')}**, which is in your allergy list — please avoid it or check the ingredients carefully.` : ''}${diet !== 'other' && d.diet !== diet && !(diet === 'vegetarian' && d.diet === 'vegan') ? `\n\nNote: this recipe is ${pretty(d.diet)}, and your preference is ${pretty(diet)}.` : ''}\n\nGeneral tip: balance matters more than any single food — pair it with vegetables or protein and keep portions moderate. [Open the recipe →](/recipes/${d.id})`);
  }
  // Food suggestions
  const mealTopic = has('southindian') ? 'south' : has('breakfast') ? 'breakfast' : has('snack') ? 'snack' : has('lunchdinner') ? 'lunchdinner' : has('protein') ? 'protein' : has('meal') && !has('weightloss') && !has('weightgain') && !has('condition') ? 'meal' : null;
  if (mealTopic) {
    let list; let title;
    if (mealTopic === 'south') { list = recipes({ cuisine: 'south', mealType: has('breakfast') || !has('lunchdinner') ? 'breakfast' : undefined }); title = 'South Indian ideas'; }
    else if (mealTopic === 'breakfast') { list = recipes({ mealType: 'breakfast' }); title = 'Breakfast ideas'; }
    else if (mealTopic === 'snack') { list = recipes({ mealType: 'snack' }); title = 'Healthy snack ideas'; }
    else if (mealTopic === 'lunchdinner') { list = [...recipes({ mealType: 'lunch' }), ...recipes({ mealType: 'dinner' })]; title = 'Lunch & dinner ideas'; }
    else if (mealTopic === 'protein') { list = recipes({ nutrition: 'high_protein' }); title = 'High-protein ideas'; }
    else {
      list = ['breakfast', 'lunch', 'snack', 'dinner'].map((mt) => rotate(recipes({ mealType: mt }), 1)[0]).filter(Boolean);
      title = "A day's meal ideas";
    }
    const picks = mealTopic === 'meal' ? list : rotate(list, 4);
    const link = mealTopic === 'snack' ? '/recipes?meal=snack' : mealTopic === 'south' ? '/recipes?cuisine=south' : mealTopic === 'breakfast' ? '/recipes?meal=breakfast' : '/recipes';
    out.push(`**${title}**${dietNote}:\n${picks.map((r) => `- ${rLink(r)}`).join('\n')}\n\n[See more →](${link}) · Say **"more"** for different ideas. Calories are estimates.`);
  }
  if (has('hydration')) {
    const w = avg(days.filter((d) => d.water.total_ml).map((d) => d.water.total_ml));
    out.push(`${w ? `You've averaged about **${w} ml** a day this week (goal ${p.water_goal_ml || 2500} ml). ` : "You haven't logged water this week. "}Tips: keep a bottle nearby, have a glass with each meal, and use the quick-add buttons in the [Water tracker](/tracker/water). Needs vary with heat, activity and health conditions.`);
  }
  if (has('sleep')) {
    const s = avg(days.filter((d) => d.sleep).map((d) => d.sleep.duration_minutes));
    out.push(`${s ? `Your average this week is about **${fmtMin(s)}** a night${s < 420 ? ' — a little under the 7–9 hours most adults need' : ' — nicely in range'}.` : "You haven't logged sleep this week — try the [Sleep tracker](/tracker/sleep)."}\n- Same bedtime and wake time daily${p.sleep_time ? ` (yours: ${p.sleep_time}–${p.wake_time})` : ''}\n- No screens 30–60 min before bed; dim lights\n- Caffeine before 2 pm; lighter dinners\n- A short evening stretch can help: ${pickWorkout('beginner', [['recovery', 20]]).map(wLink).join('')}\n\nIf poor sleep continues for weeks, please talk to a doctor.`);
  }
  if (has('stress')) {
    out.push(`That sounds tough${first ? `, ${first}` : ''}. Some things that may help right now:\n- **Box breathing:** in 4, hold 4, out 4, hold 4 — for 2 minutes\n- A **10-minute walk** or ${pickWorkout('beginner', [['yoga-stretch', 20]]).map(wLink).join('')}\n- Write down the one thing to do next — just one\n- Talk to someone you trust\n\nIf stress or low mood is affecting your daily life, please reach out to a doctor or counsellor. **Tele-MANAS (India): 14416** — free, 24/7.`);
  }
  // Workouts
  const wantsWorkout = has('workout') || has('core') || has('cardio') || has('yoga');
  if (wantsWorkout && !has('diastasis') && !has('kegel') && !has('pregnancy')) {
    const d = durationFor(minutesAsked);
    const themes = has('core') ? (d ? [['core', d], ['full-body', d]] : [['core', 20], ['core', 30]]) : has('cardio') ? [['cardio', d || 20], ['low-impact', d || 30]] : has('yoga') ? [['yoga-stretch', d || 20], ['mobility', d || 20]]
      : ({ weight_loss: [['full-body', d || 30], ['cardio', d || 20]], muscle_toning: [['upper-body', d || 30], ['lower-body', d || 30]], stamina_improvement: [['cardio', d || 30], ['full-body', d || 20]], weight_maintenance: [['full-body', d || 30], ['core', d || 20]] }[p.fitness_goal] || [['full-body', d || 20], ['yoga-stretch', d || 20]]);
    const w = pickWorkout(level, themes);
    out.push(`Here ${w.length > 1 ? 'are workouts' : 'is a workout'} for your **${level}** level${p.fitness_goal ? ` and **${pretty(p.fitness_goal)}** goal` : ''}${d ? ` (${d} min)` : ''}:\n${w.map((x) => `- ${wLink(x)} — ${x.exercise_count} exercises, plays hands-free`).join('\n')}\n\nPress **Start** and follow along. Warm-up and cool-down are included. Stop if you feel pain, dizziness or chest discomfort.`);
  }
  if (has('pain')) {
    out.push(`For **${(t.match(/back|knee|joint|neck|shoulder/) || ['the'])[0]} pain**, please get it checked by a doctor or physiotherapist — especially if it's sharp, after an injury, or comes with numbness or swelling. Avoid exercises that make it worse. Gentle options many people tolerate: ${pickWorkout('beginner', [['mobility', 20], ['low-impact', 20]]).map(wLink).join(' · ')} — but stop if the pain increases.`);
  }
  if (has('progress')) {
    const steps = avg(days.filter((x) => x.steps.count).map((x) => x.steps.count));
    const sleep = avg(days.filter((x) => x.sleep).map((x) => x.sleep.duration_minutes));
    const water = avg(days.filter((x) => x.water.total_ml).map((x) => x.water.total_ml));
    const workouts = days.reduce((s, x) => s + x.workouts.completed, 0);
    const habit = avg(days.map((x) => x.habit_completion_pct));
    out.push(`**Your last 7 days:**\n- Steps: ${steps ? `${steps.toLocaleString()}/day` : 'not logged'}\n- Water: ${water ? `${water} ml/day` : 'not logged'}\n- Sleep: ${sleep ? `${fmtMin(sleep)}/night` : 'not logged'}\n- Meals logged: ${days.filter((x) => x.meals.count).length} of 7 days\n- Workouts: ${workouts}\n- Habit completion: ${habit}%\n\n${habit >= 60 ? 'Great consistency — keep going! 🎉' : 'Pick **one** habit to log every day this week — small wins build momentum.'} Full charts: [Progress Reports](/progress).`);
  }
  if (has('motivation')) {
    out.push(`Totally normal to feel that way${first ? `, ${first}` : ''}. Try making it tiny: one **10-minute** session today${pickWorkout(level, [['mobility', 20]]).length ? '' : ''}, put your shoes by the door, and tick off one habit in the [Tracker](/tracker). Consistency beats intensity — and every streak starts with day one. 💪`);
  }
  if (!out.length) {
    return `I'm not sure I understood${first ? `, ${first}` : ''} — I can help with:\n- **Food:** "healthy snacks", "South Indian breakfast", "high-protein dinner"\n- **Workouts:** "20-minute core workout", "yoga for stiff back", "diastasis recti exercises"\n- **Health habits:** "explain my BMI", "how to sleep better", "manage stress", "review my week"\n\nI'm an AI wellness assistant, not a doctor — for medical concerns please see a healthcare professional.`;
  }
  return out.join('\n\n');
}
