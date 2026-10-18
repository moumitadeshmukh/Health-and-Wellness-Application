# Backend Spec

> Defines services, data model, business logic, AI integration and infrastructure.
> Derived from `goal-spec.md`; must implement every endpoint in `api-contract-spec.md`.

- **Spec version:** 0.2
- **Owner:** <!-- name -->
- **Last updated:** 2026-10-16
- **Status:** Draft

---

## 1. Tech Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Language / runtime | Node.js 20+ (TypeScript) | Strict mode enabled |
| Framework | Next.js 14+ (App Router, Route Handlers) | Full-stack monorepo; API routes are server-side only |
| Database | PostgreSQL 15+ via Supabase | Managed, row-level security enabled |
| ORM / migrations | Prisma | Schema-first; migrations run on deploy |
| Authentication | Supabase Auth | Email/password; JWT access + refresh tokens |
| File storage | Supabase Storage | Exercise images, export files |
| AI provider | Configurable (Claude API preferred) | Server-side only; modular adapter pattern |
| Nutrition API | Configurable (USDA FoodData Central / Open Food Facts / Edamam) | Server-side only; modular adapter pattern |
| Testing | Jest, Supertest, Prisma test client | Seeded test database |
| Linting / formatting | ESLint, Prettier | Enforced in CI |

## 2. Architecture Overview

**Style:** Modular monolith (Next.js full-stack)

```
Browser
  │
  ▼
Next.js Route Handlers  (/api/v1/*)
  │
  ├─► Auth Middleware (Supabase JWT validation)
  │
  ├─► Service Layer (business logic, validation)
  │       ├─► Prisma ORM ──► PostgreSQL (Supabase)
  │       ├─► AI Adapter ──► External AI API (server-side only)
  │       └─► Nutrition Adapter ──► External Nutrition API (server-side only)
  │
  └─► Supabase Storage (images, export files)
```

- All AI and nutrition API calls are server-side only; keys never reach the browser.
- AI and nutrition adapters implement a common interface so the provider can be swapped with no changes to the service layer.
- Row-level security (RLS) in Supabase provides a secondary defense-in-depth layer.

## 3. Modules / Services

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| Auth | Registration, login, token refresh, logout, password reset | Supabase Auth, DB |
| Users & Profile | Profile CRUD: name, age, gender, height, weight, goals, activity level, dietary preference, allergies, exercise intensity, sleep schedule | Auth, DB |
| BMI & Weight | BMI calculation, weight history (daily/weekly/monthly/yearly), weight goal management | Users, DB |
| Steps Tracker | Manual step entry, daily step goal, step history and charts | Users, DB |
| Water Tracker | Water intake logging, daily goal, totals, quick-add amounts | Users, DB |
| Meal & Food | Food item search (via Nutrition Adapter), meal log CRUD (breakfast/lunch/dinner/snack/beverage), calorie/macro summaries | Users, Nutrition Adapter, DB |
| Sleep Tracker | Bedtime/wake-up recording, sleep duration calculation, sleep history, weekly averages | Users, DB |
| Last Meal Tracker | Last meal timestamp per day, elapsed time, optional reminder configuration | Users, DB |
| Daily Summary | Aggregated daily overview across all tracker modules + habit completion percentage | All tracker modules, DB |
| Recipe Engine | Ingredient-based recipe search and ranking, AI-assisted recipe suggestions, saved recipes, recipe history, serving size adjustment | Users, AI Adapter, Nutrition Adapter, DB |
| Exercise Library | Exercise CRUD, category and filter management, detailed exercise pages | DB |
| Workout Planner | Plan generation (AI-assisted or rule-based), workout sessions, exercise completion tracking, weekly schedules | Users, Exercise Library, AI Adapter, DB |
| Progress & Insights | Trend analysis, habit streaks, weekly summaries, progress chart data aggregation | All tracker modules, DB |
| Notifications | Reminder configuration, in-app notification center, optional browser push | Users, DB |
| Data Management | User data export (JSON/CSV), account deletion pipeline | All modules, DB, Supabase Storage |
| AI Adapter | Abstraction over external AI API; prompt management, output validation, error handling, fallback | External AI API |
| Nutrition Adapter | Abstraction over external nutrition API; food search, nutritional data retrieval | External Nutrition API |

## 4. Data Model

### 4.1 Entities

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| User | id (uuid PK), email (unique), created_at, updated_at | Managed by Supabase Auth |
| Profile | user_id (FK, 1-to-1), name, age, gender?, height_cm, weight_kg, activity_level, fitness_goal, dietary_preference, allergies[], exercise_intensity, wake_time, sleep_time, updated_at | |
| WeightRecord | id, user_id FK, weight_kg (decimal), recorded_at (timestamptz), notes? | |
| WeightGoal | id, user_id FK, target_weight_kg, target_date?, created_at | One active goal per user |
| StepRecord | id, user_id FK, step_count (int), source (manual/synced), recorded_date (date), created_at | One record per date per user |
| StepGoal | id, user_id FK, daily_goal (int), created_at | |
| WaterEntry | id, user_id FK, amount_ml (int), logged_at (timestamptz), created_at | Multiple entries per day |
| WaterGoal | id, user_id FK, daily_goal_ml (int), created_at | |
| SleepRecord | id, user_id FK, bedtime (timestamptz), wake_time (timestamptz), duration_minutes (int, computed), recorded_date (date), notes?, created_at | Duration computed server-side |
| LastMealRecord | id, user_id FK, meal_time (timestamptz), recorded_date (date), created_at | |
| FoodItem | id, name, brand?, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, serving_size_g, serving_unit, source (api/manual), external_id? | Cached from nutrition API |
| MealLog | id, user_id FK, meal_type, logged_at (timestamptz), created_at | |
| MealLogItem | id, meal_log_id FK, food_item_id FK, quantity_g, calories_est, protein_est, carbs_est, fat_est, fiber_est | All estimated values |
| Ingredient | id, name, category?, unit, created_at | Shared ingredient catalog |
| UserIngredient | id, user_id FK, ingredient_id FK, quantity?, unit?, added_at | User's ingredient inventory |
| Recipe | id, name, source (database/ai_generated), meal_type, cuisine, dietary_tags[], difficulty, prep_time_min, cook_time_min, servings, image_url?, instructions (jsonb array), created_at | |
| RecipeIngredient | id, recipe_id FK, ingredient_id FK, quantity, unit, is_optional | |
| RecipeNutrition | id, recipe_id FK, calories_per_serving, protein_g, carbs_g, fat_g, fiber_g, is_estimate (always true) | |
| SavedRecipe | id, user_id FK, recipe_id FK, saved_at | Unique (user_id, recipe_id) |
| Exercise | id, name, category (enum), difficulty (enum), equipment[], target_muscles[], duration_min?, reps?, sets?, rest_seconds?, instructions (jsonb array), form_notes, breathing_guidance, modifications, safety_notes, common_mistakes, image_url?, video_url?, created_at | Seeded from curated library |
| WorkoutPlan | id, user_id FK, name, fitness_goal, fitness_level, duration_min, source (ai/rule_based), is_active, created_at | |
| WorkoutPlanExercise | id, plan_id FK, exercise_id FK, order_index, reps?, sets?, duration_min?, rest_seconds?, phase (warmup/main/cooldown) | |
| WorkoutSession | id, user_id FK, plan_id FK?, started_at (timestamptz), completed_at?, total_duration_min?, notes?, created_at | |
| ExerciseCompletion | id, session_id FK, exercise_id FK, completed (bool), reps_done?, sets_done?, duration_min?, created_at | |
| UserGoal | id, user_id FK, goal_type, target_value, unit, target_date?, created_at | |
| Reminder | id, user_id FK, reminder_type (enum), scheduled_time (time), frequency (enum), is_enabled (bool), created_at | |
| Notification | id, user_id FK, title, body, is_read (bool), created_at | |
| AIConversation | id, user_id FK, created_at | |
| AIMessage | id, conversation_id FK, role (user/assistant), content (text), created_at | |

### 4.2 Enums

```sql
ActivityLevel:        sedentary | lightly_active | moderately_active | very_active
FitnessGoal:          weight_loss | weight_maintenance | muscle_toning | stamina_improvement | general_wellness
DietaryPreference:    vegetarian | vegan | non_vegetarian | eggetarian | other
ExerciseIntensity:    beginner | intermediate | advanced
ExerciseCategory:     chest_toning | hip_lower_body | core | full_body | kegel_pelvic | stamina | facial | warmup | cooldown | stretching | mobility | posture | yoga | low_impact | recovery
ExerciseDifficulty:   beginner | intermediate | advanced
MealType:             breakfast | lunch | dinner | snack | beverage
WorkoutPhase:         warmup | main | cooldown
ReminderType:         water | meal | movement | workout | bedtime | weight_log | progress_review
ReminderFrequency:    daily | weekdays | weekends | custom
DataSource:           manual | synced
```

### 4.3 Key Indexes

```sql
-- Frequently queried by user + date
CREATE INDEX idx_weight_record_user_date    ON weight_records (user_id, recorded_at DESC);
CREATE INDEX idx_step_record_user_date      ON step_records (user_id, recorded_date DESC);
CREATE INDEX idx_water_entry_user_date      ON water_entries (user_id, logged_at DESC);
CREATE INDEX idx_sleep_record_user_date     ON sleep_records (user_id, recorded_date DESC);
CREATE INDEX idx_meal_log_user_date         ON meal_logs (user_id, logged_at DESC);
CREATE INDEX idx_workout_session_user_date  ON workout_sessions (user_id, started_at DESC);
CREATE INDEX idx_last_meal_user_date        ON last_meal_records (user_id, recorded_date DESC);

-- Exercise filtering
CREATE INDEX idx_exercise_category          ON exercises (category);
CREATE INDEX idx_exercise_difficulty        ON exercises (difficulty);

-- Food search (full-text)
CREATE INDEX idx_food_item_name             ON food_items USING GIN (to_tsvector('english', name));
CREATE INDEX idx_ingredient_name            ON ingredients USING GIN (to_tsvector('english', name));
```

## 5. Business Logic & Rules

### BMI Calculation
```
BMI = weight_kg / (height_m)^2
where height_m = height_cm / 100

Adult categories:
  < 18.5          → Underweight
  18.5 – 24.9     → Healthy weight
  25.0 – 29.9     → Overweight
  ≥ 30.0          → Obesity

Healthy weight range for a given height_cm:
  min_kg = 18.5 × (height_m)^2
  max_kg = 24.9 × (height_m)^2
```
- Do not apply adult BMI categories to users under 18. Return an appropriate message and recommend professional guidance.
- Always include BMI limitations disclaimer in every response containing a BMI value.

### Sleep Duration
```
If wake_time > bedtime on the same day:
  duration_minutes = (wake_time - bedtime) in minutes

If wake_time < bedtime (overnight sleep):
  duration_minutes = ((24h × 60) - bedtime_minutes_since_midnight) + wake_time_minutes_since_midnight
```

### Habit Completion Percentage (daily)
```
tracked_habits = [steps_logged, water_logged, at_least_one_meal_logged, sleep_logged, weight_logged]
completion_pct = (count of true) / len(tracked_habits) × 100
```

### Water Daily Total
```
daily_total_ml = SUM(amount_ml) WHERE logged_at::date = today AND user_id = current_user
```

### Calorie & Macro Daily Summaries
```
daily_calories = SUM(meal_log_items.calories_est) WHERE meal_log.logged_at::date = today
-- same for protein, carbs, fat, fiber
-- label all values as estimates in API responses
```

### Recipe Ranking Algorithm
```
1. score_ingredient_match = count(recipe_ingredients INTERSECT user_ingredients)
2. score_missing_ingredients = count(recipe_ingredients) - score_ingredient_match (lower is better)
3. score_time = prep_time_min + cook_time_min (lower is better)
Sort: score_ingredient_match DESC, score_missing_ingredients ASC, score_time ASC
Filter: exclude recipes where any ingredient matches user allergies (when ingredient data is reliable)
Filter: apply dietary_preference filter (vegetarian → exclude non-vegetarian tagged recipes, etc.)
```

### Workout Plan Rules
- Every plan must include a warmup phase and cooldown phase.
- Exercise difficulty must match or be at most one level above user's exercise_intensity setting.
- Never include localized fat-reduction claims in plan descriptions.
- Provide low-impact alternatives as separate exercise options when requested.
- Kegel exercises always include a safety caveat in the exercise description.

## 6. AI Integration

| Capability | Endpoint | Input context sent to AI | Output format | Fallback |
|------------|----------|--------------------------|---------------|---------|
| Recipe suggestions | POST /ai/recipe-suggestions | Available ingredients, dietary prefs, allergies, meal type, cuisine preference | JSON array of recipe objects | Rule-based ingredient matching |
| Meal plan generation | POST /ai/meal-plan | User profile (no email/name), fitness goal, dietary prefs, allergies, available ingredients | JSON daily/weekly meal plan | Predefined meal templates |
| Workout plan generation | POST /ai/workout-plan | Fitness goal, level, available time, equipment, recent workout history (anonymized) | JSON plan with exercises, sets, reps, rest, phases | Predefined rule-based plan library |
| Wellness assistant chat | POST /ai/chat | Last 10 messages, relevant profile context (goal, dietary pref, intensity) | Streamed text (SSE) | Static FAQ / rule-based response |
| Progress insights | GET /progress/insights | Weekly aggregated stats (no raw records) | Short JSON { summary, tips[] } | Static template-based insights |

**Prompt management:** Versioned prompt templates stored in `/src/lib/ai/prompts/`. Each prompt version is documented with its model requirements.

**Output validation:** All structured JSON responses validated against a Zod schema. On validation failure: retry once. On second failure: log the error, return the appropriate fallback.

**Safety guardrails in system prompt:**
- Refuse medical diagnosis and medication advice.
- Refuse extreme calorie restriction or rapid weight-loss plans.
- Never claim exercises can selectively burn fat from specific body areas.
- Respect the user's allergy list in all food recommendations.
- Always include a wellness disclaimer where relevant.
- Kegel suggestions must include the pelvic floor health caution.

**Cost controls:**
- AI endpoints rate-limited: 20 requests/day/user for meal/workout plan generation, 50 messages/day/user for chat.
- Cache identical AI requests (same input hash) for 1 hour.
- Log AI token usage per user for cost monitoring.

**PII handling:** Strip email address and full name before sending to AI provider. Send only: profile summary (goal, dietary pref, intensity, age range, height/weight ranges), and the specific health data required for the request.

## 7. Authentication & Authorization

- **Auth provider:** Supabase Auth
- **Token type:** JWT access token (15-minute expiry) + refresh token (7-day expiry) stored in httpOnly SameSite=Strict cookies.
- **Public endpoints:** /auth/register, /auth/login, /auth/refresh, /auth/password-reset/* 
- **Protected endpoints:** All other routes require a valid JWT. Middleware validates the token on every request.
- **Resource ownership:** Every service function checks `session.user.id === record.user_id` before read/write/delete. No user can access another user's data even if they know the record ID.
- **Row-level security:** RLS policies enabled on all Supabase tables as a secondary layer.
- **Roles:** user (default), admin (internal operations only, not exposed via public API).
- **Rate limiting:**
  - Auth endpoints: 5 requests/min/IP (Supabase + middleware).
  - AI endpoints: 20 requests/day/user.
  - General API: 200 requests/min/user (via middleware).
- **Account lockout:** Handled by Supabase Auth after configurable failed login attempts.
- **Password policy:** Min 8 characters (enforced by Supabase Auth). Hashing: argon2 (Supabase managed).

## 8. Background Jobs & Scheduling

| Job | Trigger | Action |
|-----|---------|--------|
| Send reminders | Cron every minute | Check reminders table for enabled reminders due now; create Notification records; optionally send browser push |
| Weekly progress summary | Cron Sunday 08:00 user local time | Aggregate last 7 days of data; generate insight summary; create Notification record |
| Data export | On-demand (async) | Export all user records as JSON/CSV; store in Supabase Storage with signed URL (24h expiry); notify user |
| Account deletion | On-demand (confirmed) | Soft-delete user and all records; schedule hard delete after configurable retention period |
| AI cache cleanup | Cron hourly | Remove expired AI response cache entries |

## 9. Third-Party Integrations

| Integration | Purpose | Config variable | Notes |
|-------------|---------|-----------------|-------|
| Supabase Auth | User management, JWT | NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | |
| Supabase Storage | Exercise images, export files | (same as above) | Signed URLs for private exports |
| Nutrition API | Food search, nutritional data | NUTRITION_API_KEY, NUTRITION_API_PROVIDER | Data labeled as estimates |
| AI API | Recipe suggestions, workout plans, chat | AI_API_KEY, AI_PROVIDER, AI_MODEL | Server-side only |
| Web Push API | Optional browser reminders | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY | Requires user permission grant |

## 10. Configuration & Environment

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) | Yes |
| `DIRECT_URL` | Direct DB URL for Prisma migrations | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) | Yes |
| `AI_API_KEY` | AI provider API key (server only) | Yes |
| `AI_PROVIDER` | AI provider identifier (e.g., `anthropic`) | Yes |
| `AI_MODEL` | AI model ID (e.g., `claude-sonnet-5`) | Yes |
| `NUTRITION_API_KEY` | Nutrition API key (server only) | Yes |
| `NUTRITION_API_PROVIDER` | Nutrition API identifier | Yes |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Yes |
| `VAPID_PUBLIC_KEY` | Web Push public key | Optional |
| `VAPID_PRIVATE_KEY` | Web Push private key (server only) | Optional |

Provide `.env.example` with placeholder values only. Never commit real secrets to version control.

## 11. Error Handling & Logging

- All API errors return the standard error shape defined in `api-contract-spec.md`.
- Every API response includes a `X-Request-Id` header (UUID v4, generated per request).
- Structured JSON logs: `{ timestamp, level, requestId, userId?, module, message, error? }`.
- Log levels: `error` (unexpected failures), `warn` (recoverable issues, invalid AI output), `info` (key business events such as registration, account deletion).
- Never log: email addresses, passwords, health data values (weight, steps, etc.), AI API keys, or raw request bodies containing health records.
- AI and nutrition API failures: catch → log at warn level → return fallback response with `AI_UNAVAILABLE` or `NUTRITION_UNAVAILABLE` error code.
- Unhandled errors: catch-all middleware logs at error level, returns `INTERNAL_ERROR` (500) to the client.

## 12. Security & Privacy

- HTTPS enforced in production via hosting platform.
- Input validation on every endpoint using Zod schemas; reject invalid input with 400 before it reaches the service layer.
- Parameterized queries via Prisma (no raw SQL interpolation).
- Content Security Policy headers via Next.js middleware.
- CSRF: SameSite=Strict cookies + Origin header check for state-changing requests.
- Health data encrypted at rest via Supabase/PostgreSQL infrastructure encryption.
- RLS policies ensure users cannot access each other's rows even via direct DB access with the anon key.
- Audit log table for: registration, login, password change, account deletion request, data export request.
- OWASP Top 10 checklist reviewed before production deployment (injection, broken auth, sensitive data exposure, broken access control, security misconfiguration, XSS, insecure deserialization, vulnerable components, insufficient logging, SSRF).
- API keys and service role keys are server-side environment variables only; never referenced in client components.

## 13. Performance & Scalability

- Target p95 API latency: < 500ms for standard endpoints; < 3s for AI endpoints.
- All list endpoints paginated: cursor-based (recommended) or offset/limit (max 100 per page).
- Cache AI responses for identical input hashes for 1 hour (in-memory or Redis).
- Cache exercise library responses at the CDN/Next.js edge for 24 hours (static-like data).
- Database: indexed on all FK columns and frequently-queried columns (see §4.3).
- Expected initial scale: < 500 concurrent users. Architecture supports horizontal scaling via Supabase connection pooling and serverless Next.js deployment.

## 14. Testing Strategy

| Test type | Scope | Tooling |
|-----------|-------|---------|
| Unit | BMI calculation, sleep duration, recipe ranking, habit %, water totals, calorie summaries | Jest |
| Integration | Route handler + service layer + seeded test DB | Supertest + Prisma test client |
| Contract | All endpoints validated against request/response schemas in `api-contract-spec.md` | Supertest + Zod |
| AI adapter | Mock adapter returns predefined structured responses; validate schema compliance | Jest mocks |
| Auth & authorization | Verify that all protected routes reject unauthenticated requests and cross-user access | Supertest |
| Coverage target | ≥ 80% line coverage on service layer | Jest coverage report |

## 15. Deployment & DevOps

- **Hosting:** Vercel (Next.js) + Supabase (PostgreSQL, Auth, Storage).
- **Environments:** local → staging (Vercel preview + Supabase staging project) → production.
- **CI/CD (GitHub Actions):**
  1. Lint + type check
  2. Unit tests
  3. Integration tests (test DB)
  4. Build
  5. Deploy to staging (on PR merge to `main`)
  6. Smoke tests on staging
  7. Promote to production (manual approval or auto on tag)
- **DB migrations:** `prisma migrate deploy` runs automatically on deployment. Never run manual schema changes in production.
- **Monitoring:** Vercel Analytics + Sentry (error tracking) + structured log aggregation.
- **Backups:** Supabase automated daily backups with configurable retention.
- **Secrets management:** Environment variables set via Vercel dashboard and GitHub Secrets; never committed to code.

## 16. Open Questions & Change Log

| Date | Version | Change / Question | Author |
|------|---------|-------------------|--------|
| 2026-10-16 | 0.2 | Filled all sections: tech stack (Next.js/Prisma/Supabase), 17-module architecture, full data model with all entities and enums, key indexes, business logic (BMI, sleep duration, recipe ranking, habit completion %), AI integration with prompts/validation/guardrails/cost controls/PII handling, auth strategy (Supabase Auth/JWT/RLS), background jobs, third-party integrations, environment variables, error handling, security (OWASP), performance, testing strategy, and deployment pipeline. | |
