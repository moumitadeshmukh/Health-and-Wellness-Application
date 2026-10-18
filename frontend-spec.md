# Frontend Spec

> Defines the UI, UX, state, and client behavior. Derived from `goal-spec.md`;
> all data access must go through endpoints defined in `api-contract-spec.md`.

- **Spec version:** 0.2
- **Owner:** <!-- name -->
- **Last updated:** 2026-10-16
- **Status:** Draft

---

## 1. Tech Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | Next.js 14+ (App Router) | SSR + client components |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS | Utility-first; custom design tokens |
| Component library | Custom (Tailwind-based) + Radix UI primitives | Accessible headless components |
| State management | Zustand (global: auth, theme, preferences) + TanStack Query (server state) | |
| Forms & validation | React Hook Form + Zod | Shared Zod schemas with backend |
| Charts | Recharts | Responsive wrappers for all chart types |
| Routing | Next.js App Router | File-system routing |
| Testing | Vitest, React Testing Library, Playwright (E2E) | |
| Icons | Lucide React | Consistent, accessible icon set |
| Date handling | date-fns | Lightweight; no Moment.js |

## 2. Design System

| Token | Value | Notes |
|-------|-------|-------|
| Primary color | `#16A34A` (green-600) | Health / wellness brand color |
| Primary dark | `#15803D` (green-700) | Hover and focus states |
| Accent | `#0EA5E9` (sky-500) | Charts, highlights |
| Warning | `#F59E0B` (amber-500) | Caution messages |
| Danger | `#EF4444` (red-500) | Errors, destructive actions |
| Background | `#F9FAFB` (gray-50) | Page background |
| Surface | `#FFFFFF` | Cards, modals |
| Text primary | `#111827` (gray-900) | Body copy |
| Text secondary | `#6B7280` (gray-500) | Labels, metadata |
| Border | `#E5E7EB` (gray-200) | Card borders, dividers |
| Typography | Inter (Google Fonts) | Clean, readable sans-serif |
| Border radius | `0.5rem` (rounded-lg) base | Cards; `0.375rem` for inputs |
| Shadow | Tailwind `shadow-sm` for cards | Subtle depth |
| Dark mode | Planned for Phase 5 | Toggle in settings |
| Iconography | Lucide React | 24px default; 20px in compact UI |

**Minimum touch target:** 44×44px on all interactive elements (WCAG 2.5.5).

**Color contrast:** All text/background combinations must meet WCAG 2.1 AA (≥ 4.5:1 for normal text, ≥ 3:1 for large text).

## 3. Responsive Strategy

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px (sm) | Single-column; bottom navigation bar (5 primary items + overflow menu) |
| Tablet | 640–1023px (md) | Two-column content; collapsible sidebar or bottom nav |
| Desktop | ≥ 1024px (lg) | Fixed sidebar navigation (240px); multi-column dashboard cards |

- **Approach:** Mobile-first. Tailwind breakpoint modifiers (sm, md, lg) applied upward.
- **Charts:** Recharts `ResponsiveContainer` wraps all charts; minimum height 200px on mobile.
- **Exercise cards:** Single-column stack on mobile; 2-col grid on md; 3-col on lg.
- **Dashboard cards:** Stacked on mobile; 2-col grid on md; 3–4 col on lg.
- **Forms:** Full-width on mobile; max-width 480px centered on desktop.

## 4. Information Architecture / Sitemap

```
/                   Landing page (unauthenticated)
/register           User registration
/login              User login
/auth/callback      Supabase Auth redirect handler
/onboarding         Profile & goals setup (first login)

/dashboard          Home dashboard (authenticated)
/bmi                BMI calculator & weight management
  /bmi/history      Weight history charts
/recipes            Recipe search (ingredient-based)
  /recipes/[id]     Recipe detail page
  /recipes/saved    Saved recipes list
/tracker            Daily health & habit tracker
  /tracker/steps    Steps sub-page
  /tracker/water    Water intake sub-page
  /tracker/meals    Meal diary sub-page
  /tracker/sleep    Sleep tracker sub-page
  /tracker/summary  Daily summary sub-page
/exercises          Exercise library (category browse + filters)
  /exercises/[id]   Exercise detail page
/workout            Workout planner
  /workout/history  Past workout sessions
/progress           Progress reports & insights
/coach              AI wellness assistant (P2)
/settings           Profile, preferences, privacy, notifications
  /settings/profile     Profile edit
  /settings/goals       Goal management
  /settings/reminders   Reminder configuration
  /settings/privacy     Data export & account deletion
```

## 5. Pages / Screens

### 5.1 Landing Page (`/`)
- **Auth required:** No
- **Purpose:** App introduction, value proposition, sign up / log in CTAs.
- **States:** static

### 5.2 Register & Login (`/register`, `/login`)
- **Auth required:** No
- **Route group:** `app/(auth)/` — shared centered layout with brand logo
- **Components:** RegisterPage, LoginPage, PasswordInput (show/hide toggle), FormError, PasswordStrengthBar
- **API calls:** AUTH-01 (register), AUTH-02 (login)
- **States:** idle | submitting | error | success
- **Implementation notes (register page):**
  - Fields: Full name, Email, Password (min 8 chars), Confirm password
  - Client-side validation on submit and on blur; errors shown inline below each field
  - Password strength indicator (4-segment bar: too short / fair / strong)
  - Passwords-match confirmation shown in green when both fields agree
  - Show/hide toggle on both password fields (eye icon button, aria-labeled)
  - Server error displayed in a red alert banner above the form
  - Submit button shows spinner and "Creating account…" text while loading
  - Disabled submit button during loading to prevent double-submit
  - On success → redirect to `/onboarding`
  - "Already have an account? Sign in" link to `/login`
  - Medical/wellness disclaimer shown below the submit button
  - Background: green-to-white gradient; form in white card with shadow
- **Acceptance criteria:**
  - [ ] Full name, email, password, and confirm password fields present with labels and required indicators.
  - [ ] Inline validation messages appear below each field on submit and on blur.
  - [ ] Password strength bar updates as the user types.
  - [ ] "Passwords match" confirmation appears in green when both fields agree.
  - [ ] Show/hide password toggle works on both fields and has an accessible aria-label.
  - [ ] Server errors (e.g., email already registered) shown in red alert banner.
  - [ ] Submit button is disabled and shows a spinner while the request is in flight.
  - [ ] On successful registration, user is redirected to `/onboarding`.
  - [ ] On failed registration (duplicate email), error message is surfaced without clearing the form.

### 5.3 Onboarding (`/onboarding`)
- **Auth required:** Yes
- **Purpose:** Collect full profile: name, age, gender, height, weight, fitness goal, activity level, dietary preference, allergies, exercise intensity, wake/sleep schedule.
- **Components:** MultiStepForm, ProfileStep, GoalsStep, ScheduleStep, ProgressIndicator
- **API calls:** USER-02
- **States:** step 1–5 | submitting | complete
- **Acceptance criteria:**
  - [ ] Multi-step form with progress indicator.
  - [ ] All fields validated before advancing.
  - [ ] Skip option for optional fields (gender).
  - [ ] On completion, redirect to `/dashboard`.

### 5.4 Home Dashboard (`/dashboard`)
- **Auth required:** Yes
- **Feature link:** F15
- **API calls:** DASH-01
- **States:** loading | error | success | empty (first visit)
- **Layout:**
  - Header: Welcome message + current date.
  - Row 1: WeightBMICard, StepProgressCard, WaterProgressCard.
  - Row 2: SleepSummaryCard, LastMealCard, MealSummaryCard.
  - Row 3: TodayWorkoutCard, QuickRecipeSearchCard.
  - Row 4: WeeklyProgressChart (sparklines for weight, steps, water, sleep).
  - Row 5: HabitCompletionCard (completion % + checklist).
- **Acceptance criteria:**
  - [ ] All cards load data or show appropriate empty state.
  - [ ] Quick recipe search navigates to `/recipes?ingredients=...`.
  - [ ] Clicking any card navigates to the relevant detailed page.

### 5.5 BMI & Weight (`/bmi`)
- **Auth required:** Yes
- **Feature link:** F2
- **API calls:** WEIGHT-01, WEIGHT-02, WEIGHT-05, WEIGHT-06, BMI-01
- **Components:** BMICalculator, BMIGauge, HealthyWeightRange, WeightEntryForm, WeightHistoryChart, WeightGoalCard, BMIDisclaimerBanner
- **States:** loading | empty | has-data
- **Acceptance criteria:**
  - [ ] BMI calculator auto-fills from profile height/weight; allows manual override.
  - [ ] BMI gauge visually shows position within categories.
  - [ ] Healthy weight range displayed with context.
  - [ ] BMI disclaimer banner always visible on the page.
  - [ ] Weight history chart supports daily, weekly, monthly, yearly views.
  - [ ] Current vs. target weight visualized as a progress bar.
  - [ ] Weight entry form validates range and shows success confirmation.

### 5.6 Recipes (`/recipes`)
- **Auth required:** Yes
- **Feature link:** F9, F10
- **API calls:** RECIPE-01, INGREDIENT-01
- **Components:** IngredientSearchInput, IngredientTags, AvoidIngredientInput, MealTypeSelector, DietaryTagFilter, NutritionPreferenceFilter, RecipeCard, MissingIngredientsBadge, RecipeSkeleton
- **States:** idle | searching | results | no-results | error
- **Acceptance criteria:**
  - [ ] Users can type or select ingredients from a searchable database.
  - [ ] Selected ingredients shown as removable tags.
  - [ ] Filters for meal type, dietary preference, and nutrition goals.
  - [ ] Recipe results ranked by ingredient match score.
  - [ ] Each RecipeCard shows name, image, difficulty, time, match score, and missing ingredients count.
  - [ ] Missing ingredients shown in amber/warning color.
  - [ ] Fallback to rule-based results if AI is unavailable.

### 5.7 Recipe Detail (`/recipes/[id]`)
- **Auth required:** Yes
- **Feature link:** F10
- **API calls:** RECIPE-02, RECIPE-04, RECIPE-05
- **Components:** RecipeHero, IngredientList, NutritionPanel, InstructionSteps, ServingSizeAdjuster, SaveRecipeButton, DietaryTags, EstimateDisclaimer
- **States:** loading | error | success
- **Acceptance criteria:**
  - [ ] All recipe fields displayed (name, image, ingredients, instructions, times, serving size, nutrition, difficulty, tags).
  - [ ] Serving size adjuster recalculates ingredient quantities and nutrition estimates.
  - [ ] Nutrition panel labeled as "estimates only".
  - [ ] Save/unsave recipe works with optimistic UI update.
  - [ ] Missing ingredients clearly differentiated from available ones.

### 5.8 Daily Tracker (`/tracker/*`)
- **Auth required:** Yes
- **Feature link:** F3–F8
- **Layout:** Tabbed navigation: Steps | Water | Meals | Sleep | Last Meal | Summary
- **Steps tab:** ManualStepEntry form, StepGoalCard, DailyStepProgress (ring chart), WeeklyStepChart.
- **Water tab:** QuickAddButtons (150/250/500ml + custom), WaterLog list (with edit/delete), DailyWaterProgress (wave/bar), WaterGoalCard.
- **Meals tab:** MealTypeSelector, FoodSearchInput, MealLogList (by meal type), DailyNutritionSummary, macro breakdown chart.
- **Sleep tab:** SleepEntryForm (bedtime + wake time), SleepDurationDisplay, SleepHistoryChart, PreferredScheduleCard.
- **Last Meal tab:** LastMealEntryForm, ElapsedTimeDisplay, LastMealHistory.
- **Summary tab:** DailyActivitySummary card with all tracked habits, HabitCompletionPercentage ring.
- **API calls:** STEPS-01/02/03/04, WATER-01/02/03/04, MEALS-01/02/03/04, FOOD-01, SLEEP-01/02/03/04, LASTMEAL-01/02/03, SUMMARY-01
- **Acceptance criteria:**
  - [ ] Each tab loads and saves data independently.
  - [ ] All edit and delete operations recalculate totals immediately.
  - [ ] Quick-add water buttons work with a single tap.
  - [ ] Sleep duration calculated correctly for overnight sleep.
  - [ ] Nutrition values labeled as estimates.
  - [ ] Summary tab shows all habits with completion percentage.

### 5.9 Exercise Library (`/exercises`)
- **Auth required:** Yes
- **Feature link:** F11
- **API calls:** EXERCISE-01, EXERCISE-03
- **Components:** CategoryGrid, ExerciseFilterBar, ExerciseCard, ExerciseGrid, LocatedFatLossDisclaimer, KegalSafetyBanner
- **States:** loading | filtered-results | no-results
- **Acceptance criteria:**
  - [ ] Category grid shows all 15+ categories with icons.
  - [ ] Filters: category, difficulty, duration, equipment, fitness goal.
  - [ ] ExerciseCard shows name, thumbnail, difficulty badge, duration/reps, target muscle.
  - [ ] LocatedFatLossDisclaimer shown for chest, hip, core, facial, and full-body categories.
  - [ ] KegalSafetyBanner shown prominently on the Kegel/Pelvic Floor category.

### 5.10 Exercise Detail (`/exercises/[id]`)
- **Auth required:** Yes
- **Feature link:** F11
- **API calls:** EXERCISE-02
- **Components:** ExerciseHero (image/video), TargetMuscleChip, InstructionSteps, FormNotes, BeginnerModification, RepsSetsDuration, SafetyNotes, CommonMistakes, AddToWorkoutButton
- **Acceptance criteria:**
  - [ ] All exercise fields displayed.
  - [ ] Video or image loads correctly and is labeled with its source license.
  - [ ] Safety notes and common mistakes visually prominent.
  - [ ] "Add to workout plan" button opens a plan selector modal.

### 5.11 Workout Planner (`/workout`)
- **Auth required:** Yes
- **Feature link:** F12, F13
- **API calls:** WORKOUT-01 through WORKOUT-06
- **Components:** WorkoutGeneratorForm (goal, level, duration, equipment, low-impact toggle), WorkoutPlanCard, WorkoutPhaseSection (warmup/main/cooldown), ExerciseRow (with complete toggle), WorkoutTimer, WorkoutHistoryList
- **States:** idle | generating | plan-ready | session-active | session-complete
- **Acceptance criteria:**
  - [ ] Generator form collects goal, level, duration (10/15/20/30/45min), equipment, low-impact preference.
  - [ ] Generated plan shows warmup, main, and cooldown phases with exercises.
  - [ ] User can start a session and mark individual exercises as complete.
  - [ ] Session timer tracks total workout duration.
  - [ ] On session completion, history record created.
  - [ ] AI fallback to rule-based plan when AI is unavailable (no fake AI messaging).

### 5.12 Progress Reports (`/progress`)
- **Auth required:** Yes
- **Feature link:** F14
- **API calls:** PROGRESS-01, PROGRESS-02, PROGRESS-03
- **Components:** DateRangePicker, WeightTrendChart, StepAverageChart, WaterConsistencyHeatmap, SleepTrendChart, MealLoggingConsistencyChart, ExerciseCompletionChart, HabitStreakCard, MilestoneCard, InsightPanel, ExportButton
- **States:** loading | empty (no data yet) | has-data
- **Acceptance criteria:**
  - [ ] All charts support date range selection.
  - [ ] Habit streak cards show current and longest streaks.
  - [ ] Insights panel shows AI-generated or template-based practical recommendations.
  - [ ] Empty state shown for sections with no recorded data.
  - [ ] Charts clearly distinguish estimates from recorded facts.

### 5.13 Settings (`/settings`)
- **Auth required:** Yes
- **Sub-pages:** Profile, Goals, Reminders, Privacy
- **API calls:** USER-01, USER-02, USERGOAL-*, REMINDER-*, USER-03, USER-04
- **Components:** ProfileEditForm, GoalCard, ReminderToggleList, ReminderTimeInput, DataExportCard, AccountDeletionCard
- **Acceptance criteria:**
  - [ ] Profile edits saved with success confirmation.
  - [ ] Reminders can be enabled/disabled individually with custom times.
  - [ ] Data export triggers async job and confirms when download is ready.
  - [ ] Account deletion requires typed confirmation and explains data deletion policy.

## 6. Component Inventory

| Component | Props | Description | Used in |
|-----------|-------|-------------|---------|
| `<BMICalculator />` | height_cm, weight_kg, onSave | BMI form + gauge + result | /bmi |
| `<BMIGauge />` | bmiValue | Visual semicircle gauge with category zones | /bmi, /dashboard |
| `<WeightHistoryChart />` | records[], view (daily/weekly/monthly/yearly) | Recharts LineChart for weight over time | /bmi/history |
| `<StepProgressRing />` | current, goal | Circular progress ring | /dashboard, /tracker/steps |
| `<WaterProgressBar />` | current_ml, goal_ml | Horizontal bar with wave animation | /dashboard, /tracker/water |
| `<QuickAddWater />` | onAdd(ml) | Buttons: 150/250/500/custom ml | /tracker/water |
| `<SleepSummaryCard />` | duration_minutes, bedtime, wake_time | Sleep duration display | /dashboard, /tracker/sleep |
| `<MealLogList />` | meals[], onEdit, onDelete | Grouped list by meal type | /tracker/meals |
| `<NutritionSummary />` | calories, protein, carbs, fat, fiber | Macro bar breakdown with estimate label | /tracker/meals, /dashboard |
| `<DailyActivitySummary />` | summary data | Full-day habit overview | /tracker/summary |
| `<HabitCompletionRing />` | completionPct | Ring chart with percentage | /dashboard, /tracker/summary |
| `<IngredientSearchInput />` | onAdd(ingredient) | Autocomplete ingredient search | /recipes |
| `<RecipeCard />` | recipe, matchScore, missingCount | Recipe list card with tags | /recipes |
| `<RecipeNutritionPanel />` | nutrition, servings | Macro breakdown with estimate disclaimer | /recipes/[id] |
| `<ServingSizeAdjuster />` | defaultServings, onChange | Increment/decrement stepper | /recipes/[id] |
| `<ExerciseCard />` | exercise | Thumbnail + difficulty + duration | /exercises |
| `<ExerciseFilterBar />` | filters, onChange | Filter controls for exercise library | /exercises |
| `<WorkoutPlanCard />` | plan | Plan overview with phase breakdown | /workout |
| `<WorkoutPhaseSection />` | phase, exercises[] | Warmup / Main / Cooldown section | /workout |
| `<ExerciseRow />` | exercise, onComplete | Exercise item with complete toggle | /workout |
| `<ProgressChart />` | data[], metric, dateRange | Generic Recharts wrapper for progress charts | /progress |
| `<HabitStreakCard />` | habit, currentStreak, longestStreak | Streak display with flame icon | /progress |
| `<InsightPanel />` | insights[] | List of AI or template recommendations | /progress |
| `<ReminderToggleList />` | reminders[], onToggle, onUpdate | Reminder management list | /settings/reminders |
| `<AccountDeletionCard />` | onConfirm | Confirmation flow for account deletion | /settings/privacy |
| `<SidebarNav />` | - | Desktop fixed sidebar navigation | All authenticated pages (desktop) |
| `<BottomNav />` | - | Mobile bottom navigation bar | All authenticated pages (mobile) |
| `<EstimateDisclaimer />` | - | "Nutrition values are estimates" banner | All nutrition displays |
| `<BMIDisclaimerBanner />` | - | BMI limitations notice | /bmi, /dashboard |
| `<KegalSafetyBanner />` | - | Pelvic floor exercise caution | /exercises (Kegel category) |
| `<FatLossDisclaimer />` | bodyArea | Localized fat loss disclaimer text | Exercise category pages |

## 7. User Flows

### Flow 1: Registration → Onboarding → First Dashboard
1. `/register` → fill form → submit → Supabase creates account.
2. Redirect to `/onboarding` (multi-step: profile → goals → schedule).
3. On completion → redirect to `/dashboard` with welcome state.

### Flow 2: Log Water Intake
1. `/tracker/water` → tap quick-add button (e.g., 250ml).
2. Optimistic UI: daily total updates immediately.
3. Server confirms → success toast.
4. Tap entry to edit or delete → totals recalculate.

### Flow 3: Find a Recipe with Available Ingredients
1. `/recipes` → type ingredients into IngredientSearchInput → select tags.
2. Apply dietary preference and meal type filters.
3. Results appear ranked by match score.
4. Click RecipeCard → navigate to `/recipes/[id]`.
5. Adjust serving size → nutrition panel recalculates.
6. Tap "Save Recipe" → added to `/recipes/saved`.

### Flow 4: Generate and Complete a Workout
1. `/workout` → WorkoutGeneratorForm: select goal, level, 30min, equipment, no low-impact.
2. Tap "Generate Plan" → loading state → AI or rule-based plan returned.
3. Plan displays warmup / 5 main exercises / cooldown.
4. Tap "Start Workout" → session timer starts.
5. Mark each exercise complete as it is done.
6. Tap "Finish" → session saved → redirect to completion summary.

### Flow 5: Review Weekly Progress
1. `/progress` → default view: last 7 days.
2. Weight trend chart, step averages, water consistency heatmap visible.
3. Habit streak card shows current streak.
4. Insights panel shows 2–3 practical tips based on data.
5. Change date range to last 30 days → all charts update.

### Flow 6: Set Up Reminders
1. `/settings/reminders` → toggle on "Water reminder".
2. Set time to 10:00 AM, frequency: daily.
3. Save → at 10:00 AM, in-app notification appears.
4. Browser push shown if permission was granted.

## 8. State Management & Data Fetching

### Global state (Zustand)
- `auth`: current user session, loading, error.
- `theme`: light/dark mode (dark mode Phase 5).
- `preferences`: units (metric/imperial), notifications opt-in.

### Server state (TanStack Query)
| Query key | Endpoint | Stale time |
|-----------|----------|-----------|
| `dashboard-summary` | DASH-01 | 2 minutes |
| `weight-history` | WEIGHT-01 | 5 minutes |
| `daily-steps` | STEPS-01 | 1 minute |
| `daily-water` | WATER-01 | 1 minute |
| `daily-meals` | MEALS-01 | 2 minutes |
| `sleep-records` | SLEEP-01 | 5 minutes |
| `recipes` | RECIPE-01 | 10 minutes |
| `recipe-detail` | RECIPE-02 | 30 minutes |
| `exercises` | EXERCISE-01 | 60 minutes |
| `exercise-detail` | EXERCISE-02 | 60 minutes |
| `progress-summary` | PROGRESS-01 | 10 minutes |

### Optimistic updates
- Water quick-add: add entry to list and update daily total immediately; rollback on error.
- Exercise complete toggle: mark as done immediately; rollback on error.
- Save/unsave recipe: toggle icon immediately; rollback on error.

### Offline / retry
- TanStack Query retry: 2 retries with exponential backoff on network errors.
- Stale data shown while re-fetching (stale-while-revalidate).
- Offline detection: show banner "You're offline. Some features may be unavailable."

## 9. Forms & Validation Rules

| Form | Field | Rules | Error message |
|------|-------|-------|---------------|
| Register | email | Valid email format | Please enter a valid email address |
| Register | password | Min 8 characters | Password must be at least 8 characters |
| Profile | height_cm | Number, 50–250 | Please enter a valid height (50–250 cm) |
| Profile | weight_kg | Number, 20–300 | Please enter a valid weight (20–300 kg) |
| Profile | age | Integer, 13–120 | Please enter a valid age |
| Weight entry | weight_kg | Number, 20–300 | Please enter a valid weight |
| Step entry | step_count | Integer, 0–100000 | Please enter a valid step count |
| Water entry | amount_ml | Integer, 1–5000 | Please enter a valid amount (1–5000 ml) |
| Sleep entry | bedtime | Valid time | Please enter a valid bedtime |
| Sleep entry | wake_time | Valid time | Please enter a valid wake-up time |
| Recipe search | ingredients | At least 1 ingredient | Please add at least one ingredient |
| Workout generator | duration | One of 10/15/20/30/45 | Please select a workout duration |

All forms:
- Validation triggered on submit and on blur.
- Required fields marked with `*` (visually, not just via aria-required).
- Error messages appear below the relevant field, not in a general banner.
- Success confirmations shown as transient toast notifications (3s auto-dismiss).

## 10. AI-Specific UX

- **Streaming chat:** AI wellness assistant responses stream token-by-token via SSE. A blinking cursor indicates streaming is in progress.
- **Loading indicators:** "Generating your plan..." skeleton card shown while waiting for AI endpoints (workout plan, meal plan, recipe suggestions). Never blank screen.
- **Disclaimer placement:** A non-dismissible disclaimer "This is general wellness information, not medical advice" appears at the top of the AI wellness assistant (`/coach`) and on AI-generated plan cards.
- **AI errors and timeouts:** If an AI endpoint times out or returns an error, show: "Couldn't generate a plan right now. Here's a suggested routine instead." with the rule-based fallback. Never show "AI failed."
- **Low-confidence fallback:** If the AI adapter returns a malformed response, silently serve the rule-based fallback; log the error server-side.
- **User feedback:** Thumbs up / thumbs down on AI recipe suggestions, meal plans, and workout plans. Feedback sent to POST /ai/feedback (non-blocking).
- **AI unavailable state:** When AI is unavailable, all AI-powered buttons still work but trigger rule-based logic. No UI difference visible to the user except the absence of "AI-powered" labeling.

## 11. Accessibility (WCAG 2.1 AA)

- [ ] All interactive elements keyboard-navigable (Tab, Enter, Space, Arrow keys where applicable).
- [ ] Color contrast ≥ 4.5:1 for normal text; ≥ 3:1 for large text and UI components.
- [ ] ARIA labels on all icon-only buttons (e.g., `aria-label="Delete water entry"`).
- [ ] ARIA labels on all charts (`role="img"` with descriptive `aria-label`; tabular data alternative where feasible).
- [ ] Screen reader support for dynamic content: live regions (`aria-live="polite"`) for toast notifications and loading states.
- [ ] Respect `prefers-reduced-motion`: disable chart animations and transitions when enabled.
- [ ] Form inputs have associated `<label>` elements (not placeholder-only labels).
- [ ] Error messages associated with inputs via `aria-describedby`.
- [ ] Skip navigation link at the top of every page.
- [ ] Focus visible on all interactive elements (Tailwind `focus-visible:ring-2`).
- [ ] Modal dialogs trap focus and return focus to trigger on close.

## 12. Performance Budget

| Metric | Target | Notes |
|--------|--------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | p75 real-user |
| CLS (Cumulative Layout Shift) | < 0.1 | Reserve space for images |
| INP (Interaction to Next Paint) | < 200ms | |
| Initial JS bundle | < 200KB gzip | Per-page code splitting |
| Total page weight (dashboard) | < 500KB | |

- Next.js automatic code splitting by route.
- Lazy load: exercise videos, recipe images (next/image with lazy loading).
- Exercise library: paginated (20 per page) to avoid large initial loads.
- Recharts loaded only on pages that use charts (dynamic import with `ssr: false`).
- Google Fonts loaded with `display=swap` and preconnect hint.

## 13. Error Handling & Empty States

### Error boundaries
- Global error boundary catches unhandled errors; shows generic "Something went wrong" page with a retry button.
- Per-section error boundaries on dashboard cards so one failing card doesn't break the whole dashboard.

### Network failure
- TanStack Query retries on network errors.
- If session expires during a user action: show "Your session has expired. Please log in again." and redirect to `/login` with a return URL.

### Empty states
| Section | Empty state copy |
|---------|-----------------|
| Dashboard (first visit) | "Welcome! Let's get started. Log your first weight or explore the recipe finder." |
| Weight history (no records) | "No weight records yet. Add your first entry to start tracking progress." |
| Recipe results (no match) | "No recipes found with those ingredients. Try removing some filters or adding more ingredients." |
| Exercise library (filtered, no results) | "No exercises match those filters. Try removing a filter." |
| Progress charts (no data) | "Not enough data yet. Keep logging and check back in a few days." |
| Workout history (no sessions) | "No completed workouts yet. Generate your first plan and get started!" |
| Saved recipes (none saved) | "No saved recipes. Find a recipe you like and tap the save icon." |

## 14. Security (Client)

- **Token storage:** JWT stored in httpOnly SameSite=Strict cookies (managed by Supabase Auth). Never stored in localStorage or sessionStorage.
- **XSS:** Next.js auto-escapes JSX; no `dangerouslySetInnerHTML` except where absolutely necessary (sanitized with DOMPurify).
- **CSRF:** SameSite=Strict cookies provide CSRF protection for same-site requests. All state-changing requests use POST/PATCH/DELETE (not GET).
- **API key safety:** No AI, nutrition, or Supabase service role keys referenced in any client component or page. Only `NEXT_PUBLIC_*` variables used client-side.
- **Sensitive data logging:** No health values, PII, or authentication tokens logged to the browser console or analytics.
- **Content Security Policy:** Configured in Next.js middleware; restricts scripts to self and trusted CDNs.

## 15. Analytics & Telemetry

- **Events to track:** page_view, feature_used (module name), recipe_searched, recipe_saved, workout_generated, workout_completed, ai_plan_used, habit_logged (type), reminder_set.
- **Privacy:** Collect only aggregate, anonymized events. No PII in event payloads. Show a cookie/analytics consent notice on first visit.
- **Tool:** Vercel Analytics (privacy-focused, no cookies required for basic metrics) as the default.

## 16. Navigation Structure

### Desktop (Sidebar, 240px fixed)
```
Logo + App Name
─────────────────
Dashboard
Recipes
BMI & Weight
Daily Tracker
Exercises
Workout Planner
Progress Reports
─────────────────
Profile & Settings
```

### Mobile (Bottom Navigation Bar)
```
[Dashboard] [Recipes] [Tracker] [Exercises] [More ▾]
```
"More" opens a slide-up sheet containing: BMI & Weight, Workout Planner, Progress Reports, Settings.

## 17. Open Questions & Change Log

| Date | Version | Change / Question | Author |
|------|---------|-------------------|--------|
| 2026-10-16 | 0.2 | Fully filled spec: tech stack (Next.js/Zustand/TanStack Query/Recharts), design tokens, responsive strategy (mobile-first 3 breakpoints), full sitemap (15+ routes), 13 page definitions with components/API calls/acceptance criteria, component inventory (28 components), 6 user flows, state management strategy, form validation table, AI UX patterns, accessibility checklist, performance budget, error/empty states, client security, analytics. | |
