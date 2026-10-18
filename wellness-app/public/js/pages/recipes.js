import { get, getFull, post, del } from '../api.js';
import {
  esc, icon, $, label, skeleton, errorBox, toast, toastError, withBusy, modal, options, ENUM_LABELS, today,
} from '../ui.js';

const NUTRITION = { high_protein: 'High protein', high_fiber: 'High fiber', low_added_sugar: 'Low added sugar', balanced: 'Balanced', weight_friendly: 'Weight-management friendly' };
const MEALS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks', beverage: 'Beverages' };

const recipeCard = (r, have) => `
  <a class="card" href="/recipes/${r.id}${have ? `?have=${encodeURIComponent(have)}` : ''}">
    <div class="thumb" aria-hidden="true">${r.emoji}</div>
    <div class="row between" style="align-items:flex-start"><h3 style="margin:0">${esc(r.name)}</h3>${r.is_saved ? `<span style="color:var(--danger)" aria-label="Saved">${icon('heart', 'width="18" height="18" fill="currentColor"')}</span>` : ''}</div>
    <div class="row small muted mt-s" style="gap:8px"><span class="badge ${r.difficulty === 'easy' ? 'beginner' : 'intermediate'}">${esc(r.difficulty)}</span><span>${icon('clock', 'width="14" height="14" style="display:inline"')} ${r.total_time_min} min</span><span>~${r.calories_per_serving} kcal</span></div>
    <div class="chips mt-s">${r.dietary_tags.slice(0, 3).map((t) => `<span class="tag">${esc(label(t))}</span>`).join('')}</div>
    ${r.match_count !== undefined && have ? `<div class="mt-s small"><strong style="color:var(--primary-dark)">${r.match_score}% match</strong> · ${r.matched_ingredients.length} you have${r.missing_count ? ` · <span style="color:var(--warning-text)">${r.missing_count} missing</span>` : ' · nothing missing 🎉'}</div>
      ${r.missing_count ? `<div class="tiny" style="color:var(--warning-text)">Missing: ${esc(r.missing_ingredients.join(', '))}</div>` : ''}` : ''}
  </a>`;

export async function render(ctx) {
  const { opts } = ctx;
  if (opts.view === 'detail') return detail(ctx);
  if (opts.view === 'saved') return saved(ctx);
  return search(ctx);
}

function tagInput(id, labelText, placeholder, initial, red = false) {
  return `<div class="field"><label for="${id}">${labelText}</label>
    <div class="input-group"><input class="input" id="${id}" list="${id}-list" placeholder="${placeholder}" autocomplete="off"><button type="button" class="btn btn-secondary" data-add="${id}">${icon('plus')}Add</button></div>
    <datalist id="${id}-list"></datalist>
    <div class="chips" id="${id}-tags" data-red="${red}">${initial.map((t) => tagHtml(t, red)).join('')}</div></div>`;
}
const tagHtml = (t, red) => `<span class="tag ${red ? 'red' : ''}" data-tag="${esc(t)}">${esc(t)}<button type="button" aria-label="Remove ${esc(t)}">×</button></span>`;

async function search(ctx) {
  const { root, query, me } = ctx;
  const state = {
    have: (query.get('ingredients') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    avoid: [], meal: MEALS[query.get('meal')] ? query.get('meal') : '', nutrition: '', diet: me.profile.dietary_preference || 'other', cuisine: ['indian', 'international', 'south'].includes(query.get('cuisine')) ? query.get('cuisine') : '', quick: query.get('quick') === '1',
  };
  root.innerHTML = `
    <div class="page-head"><div><h1>Recipes</h1><p>Find healthy recipes using the ingredients you already have.</p></div>
      <div class="row"><a class="btn btn-secondary" href="/recipes/saved">${icon('heart')}Saved & history</a><button class="btn btn-primary" id="mealplan">${icon('sparkles')}AI meal plan</button></div></div>
    <div class="chips mb" aria-label="Quick collections">
      <a class="chip" href="/recipes?meal=snack" style="text-decoration:none" ${state.meal === 'snack' && !state.cuisine ? 'aria-pressed="true"' : ''}>🥗 Healthy snacks</a>
      <a class="chip" href="/recipes?meal=breakfast&cuisine=south" style="text-decoration:none" ${state.meal === 'breakfast' && state.cuisine === 'south' ? 'aria-pressed="true"' : ''}>🌴 South Indian breakfast</a>
      <a class="chip" href="/recipes?cuisine=south" style="text-decoration:none" ${!state.meal && state.cuisine === 'south' ? 'aria-pressed="true"' : ''}>🍛 All South Indian</a>
      <a class="chip" href="/recipes?meal=beverage" style="text-decoration:none">🥤 Healthy drinks</a>
      <a class="chip" href="/recipes?quick=1" style="text-decoration:none" ${state.quick && !state.meal ? 'aria-pressed="true"' : ''}>⚡ Ready in 20 min</a>
    </div>
    <div class="card">
      <div class="grid grid-2">
        ${tagInput('have', 'Ingredients I have', 'e.g. tomato', state.have)}
        ${tagInput('avoid', 'Ingredients to avoid', 'e.g. mushroom', [], true)}
      </div>
      <div class="mt"><span class="label">Meal type</span><div class="chips mt-s" id="meal-chips"><button class="chip" aria-pressed="${!state.meal}" data-meal="">All</button>${Object.entries(MEALS).map(([k, v]) => `<button class="chip" aria-pressed="${state.meal === k}" data-meal="${k}">${v}</button>`).join('')}</div></div>
      <div class="mt"><span class="label">Nutrition preference</span><div class="chips mt-s" id="nut-chips"><button class="chip" aria-pressed="true" data-nut="">Any</button>${Object.entries(NUTRITION).map(([k, v]) => `<button class="chip" aria-pressed="false" data-nut="${k}">${v}</button>`).join('')}</div></div>
      <div class="mt"><span class="label">Cuisine & time</span><div class="chips mt-s" id="cui-chips"><button class="chip" aria-pressed="${!state.cuisine}" data-cui="">All cuisines</button><button class="chip" aria-pressed="${state.cuisine === 'indian'}" data-cui="indian">🇮🇳 Indian</button><button class="chip" aria-pressed="${state.cuisine === 'south'}" data-cui="south">🌴 South Indian</button><button class="chip" aria-pressed="${state.cuisine === 'international'}" data-cui="international">🌍 International</button><button class="chip" aria-pressed="${state.quick}" id="quick">⚡ Quick (≤ 20 min)</button></div></div>
      <div class="row mt"><div class="field" style="min-width:220px"><label for="diet">Dietary preference</label><select class="input" id="diet">${options({ vegan: 'Vegan', vegetarian: 'Vegetarian', eggetarian: 'Egg-based (eggetarian)', non_vegetarian: 'Non-vegetarian', other: 'Show all' }, state.diet)}</select></div>
      ${(me.profile.allergies || []).length ? `<div class="small muted" style="align-self:flex-end;padding-bottom:10px">Hiding recipes with your allergens: <strong>${esc(me.profile.allergies.join(', '))}</strong></div>` : ''}</div>
    </div>
    <div id="results" class="mt"></div>
    <p class="disclaimer mt">Nutrition values are estimates per serving and can vary with ingredients and portion sizes.</p>`;

  const runSearch = async () => {
    const box = $('#results');
    box.innerHTML = skeleton(6);
    try {
      const res = await getFull('/recipes', { ingredients: state.have.join(','), avoid: state.avoid.join(','), meal_type: state.meal, nutrition: state.nutrition, diet: state.diet, cuisine: state.cuisine, max_time: state.quick ? 20 : '' });
      const list = res.data;
      const heading = state.have.length ? 'Best matches for your ingredients' : state.meal === 'snack' ? 'Healthy snacks' : state.meal === 'breakfast' && state.cuisine === 'south' ? 'South Indian breakfasts' : state.cuisine === 'south' ? 'South Indian recipes' : state.meal ? `${MEALS[state.meal]} recipes` : 'All recipes';
      box.innerHTML = `${state.meal === 'snack' ? '<div class="banner success mb"><span>🥗</span><div class="small">Healthy snack ideas — mostly under 250 kcal, with protein or fibre to keep you full between meals. A small handful (about 30 g) is a good portion for nuts and mixes.</div></div>' : ''}<div class="row between mb"><h2 style="margin:0">${heading}</h2><span class="small muted">${list.length} recipe${list.length === 1 ? '' : 's'}</span></div>
        ${list.length ? `<div class="grid grid-3">${list.map((r) => recipeCard(r, state.have.join(','))).join('')}</div>` : `<div class="empty"><div class="big">🥕</div>No recipes match these filters. Try removing a filter or adding more ingredients.</div>`}`;
    } catch (e) { box.innerHTML = errorBox(e, false); }
  };

  const wireTags = (id, key) => {
    const input = $(`#${id}`);
    const tags = $(`#${id}-tags`);
    const red = tags.dataset.red === 'true';
    const add = () => {
      const vals = input.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      for (const v of vals) if (!state[key].includes(v)) { state[key].push(v); tags.insertAdjacentHTML('beforeend', tagHtml(v, red)); }
      input.value = '';
      if (vals.length) runSearch();
    };
    $(`[data-add="${id}"]`).addEventListener('click', add);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    input.addEventListener('change', () => { if (input.value && !input.value.includes(',')) add(); });
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = input.value.trim();
        if (q.length < 2) return;
        try { const list = await get('/ingredients/search', { q }); $(`#${id}-list`).innerHTML = list.map((i) => `<option value="${esc(i.name)}">`).join(''); } catch { /* ignore */ }
      }, 200);
    });
    tags.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const t = b.closest('[data-tag]');
      state[key] = state[key].filter((x) => x !== t.dataset.tag);
      t.remove();
      runSearch();
    });
  };
  wireTags('have', 'have');
  wireTags('avoid', 'avoid');
  const chipGroup = (sel, attr, key) => root.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll(sel).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    state[key] = b.dataset[attr];
    runSearch();
  }));
  chipGroup('[data-meal]', 'meal', 'meal');
  chipGroup('[data-nut]', 'nut', 'nutrition');
  chipGroup('[data-cui]', 'cui', 'cuisine');
  $('#quick').addEventListener('click', (e) => { state.quick = !state.quick; e.currentTarget.setAttribute('aria-pressed', String(state.quick)); runSearch(); });
  $('#diet').addEventListener('change', (e) => { state.diet = e.target.value; runSearch(); });
  $('#mealplan').addEventListener('click', (e) => mealPlanModal(e.currentTarget, state.have));
  runSearch();
}

async function mealPlanModal(btn, have) {
  await withBusy(btn, async () => {
    try {
      const plan = await post('/ai/meal-plan', { ingredients: have, cuisine: 'mixed' });
      const meals = Object.entries(plan.meals);
      const total = meals.reduce((s, [, m]) => s + (m.nutrition?.calories || 0), 0);
      modal(`<div class="row between"><h2 style="margin:0">Today's meal plan</h2><span class="badge ${plan.source === 'ai' ? 'violet' : ''}">${plan.source === 'ai' ? 'AI generated' : 'From recipe library'}</span></div>
        <ul class="list mt">${meals.map(([k, m]) => `<li style="align-items:flex-start"><div class="grow"><div class="tiny muted" style="text-transform:uppercase;letter-spacing:.05em">${esc(label(k))}</div>
          <strong>${m.recipe_id ? `<a href="/recipes/${m.recipe_id}" data-close>${esc(m.name)}</a>` : esc(m.name)}</strong><div class="small muted">${esc(m.description)}</div>
          ${m.ingredients?.length ? `<div class="tiny muted">${esc(m.ingredients.join(', '))}</div>` : ''}</div><span class="small" style="white-space:nowrap">~${m.nutrition?.calories ?? '—'} kcal</span></li>`).join('')}</ul>
        <p class="small"><strong>Total ≈ ${total} kcal</strong> <span class="badge">estimate</span></p>
        ${plan.tips?.length ? `<ul class="small">${plan.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${plan.allergy_flags?.length ? `<div class="banner warn">${icon('alert')}<div>Some AI suggestions conflicted with your allergies and were replaced.</div></div>` : ''}
        <p class="disclaimer">General ideas only — adjust portions to your needs. Nutrition values are estimates.</p>
        <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-close>Done</button></div>`, { className: 'modal' });
    } catch (e) { toastError(e); }
  }, 'Planning…');
}

async function saved(ctx) {
  const { root } = ctx;
  root.innerHTML = `<div class="page-head"><div><h1>Saved recipes</h1></div></div>${skeleton(3)}`;
  try {
    const res = await getFull('/recipes/saved');
    root.innerHTML = `
      <div class="page-head"><div><a href="/recipes" class="small">← All recipes</a><h1 class="mt-s">Saved recipes</h1><p>Your favourite recipes and what you've viewed or cooked recently.</p></div></div>
      ${res.data.length ? `<div class="grid grid-3">${res.data.map((r) => recipeCard(r)).join('')}</div>` : '<div class="empty"><div class="big">❤️</div>No saved recipes yet. Tap “Save” on any recipe to keep it here.</div>'}
      <h2 class="mt">Recently viewed or cooked</h2>
      ${res.meta.history.length ? `<div class="grid grid-3">${res.meta.history.map((r) => recipeCard(r)).join('')}</div>` : '<div class="empty small">Recipes you open will appear here.</div>'}`;
  } catch (e) { root.innerHTML = errorBox(e, false); }
}

async function detail(ctx) {
  const { root, params, query } = ctx;
  root.innerHTML = skeleton(2, 'grid-2');
  let r;
  try { r = await get(`/recipes/${params.id}`); } catch (e) { root.innerHTML = errorBox(e, false); return; }
  const have = (query.get('have') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  let servings = r.servings;
  const hasIt = (name) => have.some((h) => name.toLowerCase().includes(h) || h.includes(name.toLowerCase().replace(/\(.*?\)/g, '').trim()));
  const fmtQ = (q) => { const v = Math.round(q * 100) / 100; return Number.isInteger(v) ? v : v.toFixed(v < 1 ? 2 : 1).replace(/0$/, ''); };

  const draw = () => {
    const k = servings / r.servings;
    const n = r.nutrition;
    root.innerHTML = `
      <a href="/recipes" class="small">← Back to recipes</a>
      <div class="grid grid-2 mt">
        <div>
          <div class="thumb lg" aria-hidden="true">${r.emoji}</div>
          <h1>${esc(r.name)}</h1>
          <div class="chips">${r.dietary_tags.map((t) => `<span class="tag">${esc(label(t))}</span>`).join('')}<span class="badge">${r.region === 'south' ? 'South Indian' : esc(label(r.cuisine))}</span><span class="badge">${esc(label(r.meal_type))}</span></div>
          <div class="grid grid-3 mt">
            <div class="card" style="padding:12px"><div class="tiny muted">Prep</div><strong>${r.prep_time_min} min</strong></div>
            <div class="card" style="padding:12px"><div class="tiny muted">Cook</div><strong>${r.cook_time_min} min</strong></div>
            <div class="card" style="padding:12px"><div class="tiny muted">Difficulty</div><strong style="text-transform:capitalize">${esc(r.difficulty)}</strong></div>
          </div>
          ${r.allergy_warnings.length ? `<div class="banner warn mt">${icon('alert')}<div>Contains something on your allergy list: <strong>${esc(r.allergy_warnings.join(', '))}</strong></div></div>` : ''}
          ${r.allergens.length ? `<p class="small muted mt-s">May contain: ${esc(r.allergens.join(', '))}</p>` : ''}
          <div class="row mt">
            <button class="btn ${r.is_saved ? 'btn-secondary' : 'btn-primary'}" id="save">${icon('heart', r.is_saved ? 'fill="currentColor"' : '')}${r.is_saved ? 'Saved' : 'Save recipe'}</button>
            <button class="btn btn-secondary" id="log">${icon('utensils')}Log as meal</button>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><h2>Ingredients</h2>
              <div class="row" style="gap:6px"><button class="icon-btn sm" id="minus" aria-label="Fewer servings">−</button><span aria-live="polite"><strong>${servings}</strong> serving${servings === 1 ? '' : 's'}</span><button class="icon-btn sm" id="plus" aria-label="More servings">+</button></div></div>
            <ul class="list">${r.ingredients.map((i) => {
              const own = have.length ? hasIt(i.name) : null;
              return `<li><span class="grow">${own === true ? `<span style="color:var(--primary-dark)">✓</span> ` : own === false && !i.is_optional ? '<span style="color:var(--warning-text)">•</span> ' : ''}${esc(i.name)}${i.is_optional ? ' <span class="tiny muted">(optional)</span>' : ''}${own === false && !i.is_optional ? ' <span class="badge intermediate">missing</span>' : ''}</span><span class="small muted">${fmtQ(i.quantity * k)} ${esc(i.unit)}</span></li>`;
            }).join('')}</ul>
          </div>
          <div class="card">
            <div class="card-head"><h2>Nutrition</h2><span class="badge">Estimates only</span></div>
            <div class="grid grid-3 small">
              <div><div class="muted">Calories</div><strong>${n.calories} kcal</strong></div>
              <div><div class="muted">Protein</div><strong>${n.protein_g} g</strong></div>
              <div><div class="muted">Carbs</div><strong>${n.carbs_g} g</strong></div>
              <div><div class="muted">Fat</div><strong>${n.fat_g} g</strong></div>
              <div><div class="muted">Fiber</div><strong>${n.fiber_g} g</strong></div>
            </div>
            <p class="tiny muted mt-s">Per serving. For ${servings} serving${servings === 1 ? '' : 's'}: ≈ ${Math.round(n.calories * servings)} kcal, ${Math.round(n.protein_g * servings)} g protein.</p>
          </div>
        </div>
      </div>
      <div class="card mt"><h2>Method</h2><ol class="steps-ol mt">${r.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <div class="card mt row between"><span>Was this recipe helpful?</span><div class="row" id="fb"><button class="btn btn-secondary btn-sm" data-rate="up">${icon('thumbsUp')}Yes</button><button class="btn btn-secondary btn-sm" data-rate="down">${icon('thumbsDown')}No</button></div></div>`;

    root.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', async () => {
      try { await post('/ai/feedback', { rating: b.dataset.rate, context: `recipe:${r.id}` }); $('#fb').innerHTML = '<span class="small muted">Thanks for your feedback!</span>'; } catch (e) { toastError(e); }
    }));
    $('#minus').addEventListener('click', () => { if (servings > 1) { servings--; draw(); } });
    $('#plus').addEventListener('click', () => { if (servings < 12) { servings++; draw(); } });
    $('#save').addEventListener('click', async () => {
      const was = r.is_saved;
      r.is_saved = !was; draw(); // optimistic
      try { if (was) await del(`/recipes/saved/${r.id}`); else await post('/recipes/saved', { recipe_id: r.id }); toast(was ? 'Removed from saved' : 'Recipe saved ❤️'); }
      catch (e) { r.is_saved = was; draw(); toastError(e); }
    });
    $('#log').addEventListener('click', () => {
      modal(`<h2>Log ${esc(r.name)}</h2><form id="lf" class="stack">
        <div class="field"><label for="lm">Meal</label><select class="input" id="lm">${options(ENUM_LABELS.meal_type, r.meal_type)}</select></div>
        <div class="field"><label for="ls">Servings eaten</label><input class="input" id="ls" type="number" min="0.25" max="10" step="0.25" value="1"></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Log meal</button></div></form>`, {
        onMount: (el, close) => el.querySelector('#lf').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await post('/tracker/meals', { meal_type: el.querySelector('#lm').value, date: today(), items: [{ recipe_id: r.id, servings: Number(el.querySelector('#ls').value) }] });
            close(); toast('Meal logged ✓');
          } catch (err) { toastError(err); }
        }),
      });
    });
  };
  draw();
}
