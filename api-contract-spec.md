# API Contract Spec

> The binding contract between frontend and backend. Neither side may deviate
> without updating this document first.

- **Spec version:** 0.2
- **Owner:** <!-- name -->
- **Last updated:** 2026-10-16
- **Status:** Draft

---

## 1. General Conventions

- **Base URL:** `https://api.example.com/api/v1` (configure via `NEXT_PUBLIC_APP_URL`)
- **Protocol / format:** HTTPS only; JSON (`Content-Type: application/json`)
- **Versioning:** URL path (`/v1`); breaking changes require `/v2`
- **Naming:** `snake_case` for all JSON fields
- **Dates/times:** ISO 8601 UTC (e.g., `2026-10-16T05:57:00Z`)
- **Dates only:** `YYYY-MM-DD` (e.g., `2026-10-16`)
- **Times only:** `HH:MM` 24-hour (e.g., `22:30`)
- **IDs:** UUID v4 strings
- **Units:** metric by default (kg, cm, ml); include a `unit` field where relevant
- **Estimates:** any nutritional value derived from a food/nutrition API must be accompanied by `"is_estimate": true`

## 2. Authentication

- **Scheme:** `Authorization: Bearer <access_token>` on all protected endpoints
- **Token lifetime:** access token 15 minutes; refresh token 7 days
- **Cookie alternative:** httpOnly SameSite=Strict cookie (preferred for browser clients)
- **Public endpoints:** `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/password-reset/*`
- **All other endpoints:** require a valid, unexpired access token

## 3. Standard Response Shapes

### Success (single resource)
```json
{
  "data": { "...": "..." },
  "meta": {}
}
```

### Success (list)
```json
{
  "data": [ { "...": "..." } ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 134
  }
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [{ "field": "weight_kg", "issue": "must be between 20 and 300" }],
    "request_id": "uuid"
  }
}
```

### Pagination
- Query params: `?page=1&limit=20` (max limit: 100)
- Cursor-based alternative for high-volume lists: `?cursor=<opaque_string>&limit=20`

## 4. Status Codes & Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 200 | — | OK |
| 201 | — | Created |
| 204 | — | No content (DELETE success) |
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `UNAUTHENTICATED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Authenticated but not authorized |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g., email already registered) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `AI_UNAVAILABLE` | AI provider failed; fallback served |
| 503 | `NUTRITION_UNAVAILABLE` | Nutrition API failed |

## 5. Endpoint Index

### Auth
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| AUTH-01 | POST | /auth/register | No | F1 |
| AUTH-02 | POST | /auth/login | No | F1 |
| AUTH-03 | POST | /auth/refresh | No | F1 |
| AUTH-04 | POST | /auth/logout | Yes | F1 |
| AUTH-05 | POST | /auth/password-reset/request | No | F1 |
| AUTH-06 | POST | /auth/password-reset/confirm | No | F1 |

### Users & Profile
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| USER-01 | GET | /users/me | Yes | F1 |
| USER-02 | PATCH | /users/me/profile | Yes | F1 |
| USER-03 | DELETE | /users/me | Yes | F20 |
| USER-04 | POST | /users/me/export | Yes | F20 |

### BMI & Weight
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| BMI-01 | POST | /bmi/calculate | Yes | F2 |
| WEIGHT-01 | GET | /weight | Yes | F2 |
| WEIGHT-02 | POST | /weight | Yes | F2 |
| WEIGHT-03 | PATCH | /weight/:id | Yes | F2 |
| WEIGHT-04 | DELETE | /weight/:id | Yes | F2 |
| WEIGHT-05 | GET | /weight/goal | Yes | F2 |
| WEIGHT-06 | PUT | /weight/goal | Yes | F2 |

### Steps Tracker
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| STEPS-01 | GET | /tracker/steps | Yes | F3 |
| STEPS-02 | POST | /tracker/steps | Yes | F3 |
| STEPS-03 | PATCH | /tracker/steps/:id | Yes | F3 |
| STEPS-04 | DELETE | /tracker/steps/:id | Yes | F3 |
| STEPS-05 | GET | /tracker/steps/goal | Yes | F3 |
| STEPS-06 | PUT | /tracker/steps/goal | Yes | F3 |

### Water Tracker
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| WATER-01 | GET | /tracker/water | Yes | F4 |
| WATER-02 | POST | /tracker/water | Yes | F4 |
| WATER-03 | PATCH | /tracker/water/:id | Yes | F4 |
| WATER-04 | DELETE | /tracker/water/:id | Yes | F4 |
| WATER-05 | GET | /tracker/water/goal | Yes | F4 |
| WATER-06 | PUT | /tracker/water/goal | Yes | F4 |

### Meals & Food
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| FOOD-01 | GET | /foods/search | Yes | F5 |
| MEALS-01 | GET | /tracker/meals | Yes | F5 |
| MEALS-02 | POST | /tracker/meals | Yes | F5 |
| MEALS-03 | PATCH | /tracker/meals/:id | Yes | F5 |
| MEALS-04 | DELETE | /tracker/meals/:id | Yes | F5 |

### Sleep Tracker
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| SLEEP-01 | GET | /tracker/sleep | Yes | F6 |
| SLEEP-02 | POST | /tracker/sleep | Yes | F6 |
| SLEEP-03 | PATCH | /tracker/sleep/:id | Yes | F6 |
| SLEEP-04 | DELETE | /tracker/sleep/:id | Yes | F6 |

### Last Meal Tracker
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| LASTMEAL-01 | GET | /tracker/last-meal/today | Yes | F7 |
| LASTMEAL-02 | POST | /tracker/last-meal | Yes | F7 |
| LASTMEAL-03 | DELETE | /tracker/last-meal/:id | Yes | F7 |

### Daily Summary
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| SUMMARY-01 | GET | /tracker/summary | Yes | F8 |

### Recipes & Ingredients
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| INGREDIENT-01 | GET | /ingredients/search | Yes | F9 |
| RECIPE-01 | GET | /recipes | Yes | F9 |
| RECIPE-02 | GET | /recipes/:id | Yes | F10 |
| RECIPE-03 | GET | /recipes/saved | Yes | F10 |
| RECIPE-04 | POST | /recipes/saved | Yes | F10 |
| RECIPE-05 | DELETE | /recipes/saved/:recipe_id | Yes | F10 |

### Exercises
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| EXERCISE-01 | GET | /exercises | Yes | F11 |
| EXERCISE-02 | GET | /exercises/:id | Yes | F11 |
| EXERCISE-03 | GET | /exercises/categories | Yes | F11 |

### Workout Planner
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| WORKOUT-01 | POST | /workout-plans/generate | Yes | F12 |
| WORKOUT-02 | GET | /workout-plans | Yes | F12 |
| WORKOUT-03 | GET | /workout-plans/:id | Yes | F12 |
| WORKOUT-04 | POST | /workout-sessions | Yes | F13 |
| WORKOUT-05 | PATCH | /workout-sessions/:id | Yes | F13 |
| WORKOUT-06 | POST | /workout-sessions/:id/complete-exercise | Yes | F13 |

### Progress & Insights
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| PROGRESS-01 | GET | /progress/summary | Yes | F14 |
| PROGRESS-02 | GET | /progress/habits | Yes | F14 |
| PROGRESS-03 | GET | /progress/insights | Yes | F14 |

### Reminders & Notifications
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| NOTIF-01 | GET | /notifications | Yes | F16 |
| NOTIF-02 | PATCH | /notifications/:id/read | Yes | F16 |
| REMINDER-01 | GET | /reminders | Yes | F16 |
| REMINDER-02 | POST | /reminders | Yes | F16 |
| REMINDER-03 | PATCH | /reminders/:id | Yes | F16 |
| REMINDER-04 | DELETE | /reminders/:id | Yes | F16 |

### AI
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| AI-01 | POST | /ai/meal-plan | Yes | F17 |
| AI-02 | POST | /ai/workout-plan | Yes | F18 |
| AI-03 | POST | /ai/chat | Yes | F19 |
| AI-04 | POST | /ai/recipe-suggestions | Yes | F9 |
| AI-05 | POST | /ai/feedback | Yes | F17, F18, F19 |

### Dashboard
| ID | Method | Path | Auth | Feature |
|----|--------|------|------|---------|
| DASH-01 | GET | /dashboard/summary | Yes | F15 |

---

## 6. Endpoint Definitions

### AUTH-01 — Register
- **Method & path:** `POST /auth/register`
- **Auth:** None
- **Rate limit:** 5/min/IP

**Request body**
```json
{
  "email": "user@example.com",
  "password": "string (min 8 chars)",
  "name": "string"
}
```

**Validation rules**
| Field | Type | Required | Rules |
|-------|------|----------|-------|
| email | string | Yes | Valid email format; unique |
| password | string | Yes | Min 8 characters |
| name | string | Yes | Min 1 char, max 100 chars |

**Success — `201 Created`**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "user@example.com", "name": "string" },
    "tokens": { "access_token": "string", "refresh_token": "string" }
  }
}
```

**Errors**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid input |
| 409 | CONFLICT | Email already registered |

---

### AUTH-02 — Login
- **Method & path:** `POST /auth/login`
- **Auth:** None
- **Rate limit:** 10/min/IP

**Request body**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Success — `200 OK`**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "string", "name": "string" },
    "tokens": { "access_token": "string", "refresh_token": "string" }
  }
}
```

**Errors**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Missing fields |
| 401 | UNAUTHENTICATED | Invalid credentials |

---

### USER-02 — Update Profile
- **Method & path:** `PATCH /users/me/profile`
- **Auth:** Bearer

**Request body** (all fields optional; only provided fields updated)
```json
{
  "name": "string",
  "age": 30,
  "gender": "female | male | non_binary | prefer_not_to_say | null",
  "height_cm": 165,
  "weight_kg": 65.5,
  "activity_level": "sedentary | lightly_active | moderately_active | very_active",
  "fitness_goal": "weight_loss | weight_maintenance | muscle_toning | stamina_improvement | general_wellness",
  "dietary_preference": "vegetarian | vegan | non_vegetarian | eggetarian | other",
  "allergies": ["nuts", "dairy"],
  "exercise_intensity": "beginner | intermediate | advanced",
  "wake_time": "06:30",
  "sleep_time": "22:30"
}
```

**Success — `200 OK`**
```json
{
  "data": { "profile": { "...all profile fields..." } }
}
```

---

### BMI-01 — Calculate BMI
- **Method & path:** `POST /bmi/calculate`
- **Auth:** Bearer

**Request body**
```json
{
  "height_cm": 165,
  "weight_kg": 65.5
}
```

**Success — `200 OK`**
```json
{
  "data": {
    "bmi": 24.1,
    "category": "healthy_weight",
    "healthy_weight_range_kg": { "min": 50.4, "max": 67.9 },
    "disclaimer": "BMI is a screening tool and does not directly measure body fat or determine complete health status.",
    "unit": "kg_m2"
  }
}
```

**BMI categories returned:** `underweight` | `healthy_weight` | `overweight` | `obesity`

---

### WEIGHT-01 — List Weight Records
- **Method & path:** `GET /weight`
- **Auth:** Bearer
- **Query params:** `?from=2026-01-01&to=2026-10-16&view=daily|weekly|monthly|yearly&page=1&limit=50`

**Success — `200 OK`**
```json
{
  "data": [
    { "id": "uuid", "weight_kg": 65.5, "recorded_at": "2026-10-16T07:00:00Z", "notes": null }
  ],
  "meta": { "page": 1, "limit": 50, "total": 120 }
}
```

---

### WEIGHT-02 — Log Weight
- **Method & path:** `POST /weight`
- **Auth:** Bearer

**Request body**
```json
{
  "weight_kg": 65.5,
  "recorded_at": "2026-10-16T07:00:00Z",
  "notes": "optional string"
}
```

**Success — `201 Created`**
```json
{ "data": { "id": "uuid", "weight_kg": 65.5, "recorded_at": "...", "notes": null } }
```

---

### WATER-02 — Log Water Intake
- **Method & path:** `POST /tracker/water`
- **Auth:** Bearer

**Request body**
```json
{
  "amount_ml": 250,
  "logged_at": "2026-10-16T10:30:00Z"
}
```

**Success — `201 Created`**
```json
{
  "data": {
    "entry": { "id": "uuid", "amount_ml": 250, "logged_at": "..." },
    "daily_total_ml": 1250,
    "goal_ml": 2500,
    "progress_pct": 50
  }
}
```

---

### WATER-01 — List Water Entries
- **Method & path:** `GET /tracker/water`
- **Auth:** Bearer
- **Query params:** `?date=2026-10-16` (defaults to today)

**Success — `200 OK`**
```json
{
  "data": {
    "entries": [
      { "id": "uuid", "amount_ml": 250, "logged_at": "2026-10-16T10:30:00Z" }
    ],
    "daily_total_ml": 1250,
    "goal_ml": 2500,
    "progress_pct": 50
  }
}
```

---

### STEPS-02 — Log Steps
- **Method & path:** `POST /tracker/steps`
- **Auth:** Bearer

**Request body**
```json
{
  "step_count": 8500,
  "recorded_date": "2026-10-16",
  "source": "manual"
}
```

**Success — `201 Created`**
```json
{
  "data": {
    "record": { "id": "uuid", "step_count": 8500, "recorded_date": "2026-10-16", "source": "manual" },
    "daily_goal": 10000,
    "progress_pct": 85
  }
}
```

---

### SLEEP-02 — Log Sleep
- **Method & path:** `POST /tracker/sleep`
- **Auth:** Bearer

**Request body**
```json
{
  "bedtime": "2026-10-15T22:30:00Z",
  "wake_time": "2026-10-16T06:30:00Z",
  "recorded_date": "2026-10-16",
  "notes": "optional"
}
```

**Success — `201 Created`**
```json
{
  "data": {
    "id": "uuid",
    "bedtime": "2026-10-15T22:30:00Z",
    "wake_time": "2026-10-16T06:30:00Z",
    "duration_minutes": 480,
    "recorded_date": "2026-10-16"
  }
}
```

---

### SUMMARY-01 — Daily Activity Summary
- **Method & path:** `GET /tracker/summary`
- **Auth:** Bearer
- **Query params:** `?date=2026-10-16` (defaults to today)

**Success — `200 OK`**
```json
{
  "data": {
    "date": "2026-10-16",
    "steps": { "count": 8500, "goal": 10000, "progress_pct": 85 },
    "water": { "total_ml": 1500, "goal_ml": 2500, "progress_pct": 60 },
    "meals": {
      "logged_count": 2,
      "calories_est": 1400,
      "protein_est_g": 75,
      "carbs_est_g": 160,
      "fat_est_g": 45,
      "fiber_est_g": 18,
      "is_estimate": true
    },
    "sleep": { "duration_minutes": 480, "bedtime": "22:30", "wake_time": "06:30" },
    "last_meal": { "meal_time": "2026-10-16T13:00:00Z", "elapsed_minutes": 180 },
    "weight": { "weight_kg": 65.5, "recorded_at": "2026-10-16T07:00:00Z" },
    "workouts_completed": 1,
    "habit_completion_pct": 80,
    "habits": {
      "steps_logged": true,
      "water_logged": true,
      "meal_logged": true,
      "sleep_logged": true,
      "weight_logged": true
    }
  }
}
```

---

### RECIPE-01 — Search Recipes by Ingredients
- **Method & path:** `GET /recipes`
- **Auth:** Bearer
- **Query params:**
  - `ingredients` — comma-separated ingredient IDs or names (required, min 1)
  - `avoid` — comma-separated ingredient names to exclude
  - `meal_type` — `breakfast | lunch | dinner | snack | beverage`
  - `dietary` — `vegetarian | vegan | non_vegetarian | eggetarian`
  - `preference` — `high_protein | high_fiber | low_sugar | balanced | weight_friendly`
  - `page`, `limit`

**Success — `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Dal Tadka",
      "image_url": "string | null",
      "meal_type": "lunch",
      "cuisine": "indian",
      "dietary_tags": ["vegetarian", "high_protein"],
      "difficulty": "easy",
      "prep_time_min": 10,
      "cook_time_min": 25,
      "servings": 2,
      "match_score": 5,
      "matched_ingredients": 5,
      "missing_ingredients": [
        { "name": "cumin seeds", "quantity": "1 tsp", "unit": "tsp" }
      ],
      "nutrition_per_serving": {
        "calories": 280,
        "protein_g": 14,
        "carbs_g": 38,
        "fat_g": 7,
        "fiber_g": 9,
        "is_estimate": true
      }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 47 }
}
```

---

### RECIPE-02 — Get Recipe Detail
- **Method & path:** `GET /recipes/:id`
- **Auth:** Bearer

**Success — `200 OK`**
```json
{
  "data": {
    "id": "uuid",
    "name": "Dal Tadka",
    "image_url": "string | null",
    "meal_type": "lunch",
    "cuisine": "indian",
    "dietary_tags": ["vegetarian", "high_protein"],
    "difficulty": "easy",
    "prep_time_min": 10,
    "cook_time_min": 25,
    "servings": 2,
    "ingredients": [
      { "name": "red lentils", "quantity": 1, "unit": "cup", "is_optional": false },
      { "name": "cumin seeds", "quantity": 1, "unit": "tsp", "is_optional": false }
    ],
    "instructions": [
      { "step": 1, "text": "Rinse lentils and cook with water until soft." },
      { "step": 2, "text": "Heat oil in a pan and add cumin seeds." }
    ],
    "nutrition_per_serving": {
      "calories": 280,
      "protein_g": 14,
      "carbs_g": 38,
      "fat_g": 7,
      "fiber_g": 9,
      "is_estimate": true
    },
    "is_saved": false
  }
}
```

---

### EXERCISE-01 — List Exercises
- **Method & path:** `GET /exercises`
- **Auth:** Bearer
- **Query params:**
  - `category` — see ExerciseCategory enum
  - `difficulty` — `beginner | intermediate | advanced`
  - `duration_max_min` — max duration in minutes
  - `equipment` — comma-separated equipment names
  - `goal` — fitness goal filter
  - `page`, `limit`

**Success — `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Plank",
      "category": "core",
      "difficulty": "beginner",
      "target_muscles": ["transverse_abdominis", "rectus_abdominis"],
      "duration_min": null,
      "reps": null,
      "sets": 3,
      "rest_seconds": 30,
      "equipment": [],
      "image_url": "string | null",
      "safety_disclaimer": "Strengthening your core does not specifically eliminate stomach fat."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 85 }
}
```

---

### EXERCISE-02 — Get Exercise Detail
- **Method & path:** `GET /exercises/:id`
- **Auth:** Bearer

**Success — `200 OK`**
```json
{
  "data": {
    "id": "uuid",
    "name": "Plank",
    "category": "core",
    "difficulty": "beginner",
    "target_muscles": ["transverse_abdominis", "rectus_abdominis"],
    "instructions": [
      { "step": 1, "text": "Start in a push-up position with forearms on the floor." },
      { "step": 2, "text": "Keep your body in a straight line from head to heels." }
    ],
    "form_notes": "Do not let your hips sag or rise. Keep your core engaged throughout.",
    "breathing_guidance": "Breathe steadily; do not hold your breath.",
    "modifications": "Knee plank: rest knees on the floor for a lower-intensity option.",
    "reps": null,
    "sets": 3,
    "duration_min": 1,
    "rest_seconds": 30,
    "equipment": [],
    "safety_notes": "Stop if you experience lower-back pain. Ensure proper form before increasing duration.",
    "common_mistakes": "Allowing the hips to sag; holding breath; looking up instead of at the floor.",
    "image_url": "string | null",
    "video_url": "string | null",
    "safety_disclaimer": "Core exercises strengthen muscles and improve stability. They do not specifically eliminate stomach fat, which depends on overall energy balance."
  }
}
```

---

### WORKOUT-01 — Generate Workout Plan
- **Method & path:** `POST /workout-plans/generate`
- **Auth:** Bearer
- **Rate limit:** 20/day/user

**Request body**
```json
{
  "fitness_goal": "weight_loss",
  "fitness_level": "beginner",
  "duration_min": 30,
  "equipment": ["none"],
  "low_impact": false
}
```

**Success — `201 Created`**
```json
{
  "data": {
    "plan": {
      "id": "uuid",
      "name": "Beginner Weight Loss — 30 min",
      "source": "ai",
      "fitness_goal": "weight_loss",
      "fitness_level": "beginner",
      "duration_min": 30,
      "phases": [
        {
          "phase": "warmup",
          "exercises": [
            { "exercise_id": "uuid", "name": "Marching in place", "duration_min": 3, "reps": null, "sets": null, "rest_seconds": 0, "order_index": 1 }
          ]
        },
        {
          "phase": "main",
          "exercises": [
            { "exercise_id": "uuid", "name": "Bodyweight Squat", "duration_min": null, "reps": 12, "sets": 3, "rest_seconds": 30, "order_index": 2 }
          ]
        },
        {
          "phase": "cooldown",
          "exercises": [
            { "exercise_id": "uuid", "name": "Standing quad stretch", "duration_min": 2, "reps": null, "sets": null, "rest_seconds": 0, "order_index": 7 }
          ]
        }
      ]
    },
    "disclaimer": "This plan is for general wellness purposes. Consult a healthcare professional before starting a new exercise programme."
  }
}
```

**On AI failure — `200 OK` with fallback:**
```json
{
  "data": { "plan": { "...": "...", "source": "rule_based" } },
  "meta": { "ai_status": "unavailable", "fallback_used": true }
}
```

---

### WORKOUT-04 — Start Workout Session
- **Method & path:** `POST /workout-sessions`
- **Auth:** Bearer

**Request body**
```json
{
  "plan_id": "uuid | null",
  "started_at": "2026-10-16T08:00:00Z"
}
```

**Success — `201 Created`**
```json
{ "data": { "session_id": "uuid", "plan_id": "uuid | null", "started_at": "..." } }
```

---

### WORKOUT-06 — Mark Exercise Complete
- **Method & path:** `POST /workout-sessions/:id/complete-exercise`
- **Auth:** Bearer

**Request body**
```json
{
  "exercise_id": "uuid",
  "reps_done": 12,
  "sets_done": 3,
  "duration_min": null
}
```

**Success — `201 Created`**
```json
{ "data": { "completion_id": "uuid", "exercise_id": "uuid", "completed": true } }
```

---

### PROGRESS-01 — Progress Summary
- **Method & path:** `GET /progress/summary`
- **Auth:** Bearer
- **Query params:** `?from=2026-10-01&to=2026-10-16`

**Success — `200 OK`**
```json
{
  "data": {
    "weight": {
      "records": [ { "date": "2026-10-01", "weight_kg": 67.0 }, { "date": "2026-10-16", "weight_kg": 65.5 } ],
      "change_kg": -1.5,
      "trend": "decreasing"
    },
    "steps": {
      "average_daily": 8200,
      "goal": 10000,
      "days_goal_met": 9
    },
    "water": {
      "average_daily_ml": 2100,
      "goal_ml": 2500,
      "days_goal_met": 11,
      "consistency_pct": 73
    },
    "sleep": {
      "average_duration_minutes": 450,
      "records": [ { "date": "2026-10-01", "duration_minutes": 420 } ]
    },
    "workouts": {
      "sessions_completed": 8,
      "total_duration_min": 210,
      "average_duration_min": 26
    },
    "meals": {
      "days_logged": 14,
      "logging_consistency_pct": 88,
      "average_daily_calories_est": 1650,
      "is_estimate": true
    }
  }
}
```

---

### PROGRESS-02 — Habit Streaks
- **Method & path:** `GET /progress/habits`
- **Auth:** Bearer

**Success — `200 OK`**
```json
{
  "data": {
    "streaks": [
      { "habit": "water", "current_streak_days": 5, "longest_streak_days": 12 },
      { "habit": "steps", "current_streak_days": 3, "longest_streak_days": 7 },
      { "habit": "meal_logging", "current_streak_days": 14, "longest_streak_days": 14 },
      { "habit": "sleep_logging", "current_streak_days": 2, "longest_streak_days": 9 },
      { "habit": "weight_logging", "current_streak_days": 6, "longest_streak_days": 10 }
    ],
    "milestones": [
      { "label": "First 7-day meal logging streak", "achieved_at": "2026-10-09" }
    ]
  }
}
```

---

### AI-03 — Coach Chat (streaming)
- **Method & path:** `POST /ai/chat`
- **Auth:** Bearer
- **Response type:** `text/event-stream` (SSE)
- **Rate limit:** 50 messages/day/user

**Request body**
```json
{
  "conversation_id": "uuid | null",
  "message": "string (max 2000 chars)"
}
```

**Stream events**
```
event: token   data: {"text": "..."}
event: done    data: {"conversation_id": "uuid", "message_id": "uuid"}
event: error   data: {"code": "AI_UNAVAILABLE", "message": "AI assistant is unavailable. Please try again later."}
```

**Disclaimer:** Every chat session starts with a system message: "I provide general wellness information only. This is not medical advice. Please consult a healthcare professional for medical concerns."

---

### DASH-01 — Dashboard Summary
- **Method & path:** `GET /dashboard/summary`
- **Auth:** Bearer

**Success — `200 OK`**
```json
{
  "data": {
    "user": { "name": "string", "fitness_goal": "weight_loss" },
    "today": {
      "date": "2026-10-16",
      "weight": { "weight_kg": 65.5, "bmi": 24.1, "bmi_category": "healthy_weight" },
      "steps": { "count": 5000, "goal": 10000, "progress_pct": 50 },
      "water": { "total_ml": 1000, "goal_ml": 2500, "progress_pct": 40 },
      "meals_logged": 1,
      "sleep": { "duration_minutes": 480, "wake_time": "06:30" },
      "last_meal_time": "2026-10-16T08:00:00Z",
      "workouts_completed": 0,
      "habit_completion_pct": 40
    },
    "weekly_sparklines": {
      "weight": [ { "date": "2026-10-10", "value": 66.0 } ],
      "steps": [ { "date": "2026-10-10", "value": 7500 } ],
      "water_ml": [ { "date": "2026-10-10", "value": 2000 } ],
      "sleep_minutes": [ { "date": "2026-10-10", "value": 450 } ]
    },
    "todays_workout_plan": {
      "plan_id": "uuid | null",
      "name": "Beginner Weight Loss — 30 min",
      "duration_min": 30,
      "phase_count": 3
    }
  }
}
```

---

## 7. Shared Schemas / Types

```ts
type UserProfile = {
  id: string;
  name: string;
  age: number | null;
  gender: "female" | "male" | "non_binary" | "prefer_not_to_say" | null;
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active";
  fitness_goal: "weight_loss" | "weight_maintenance" | "muscle_toning" | "stamina_improvement" | "general_wellness";
  dietary_preference: "vegetarian" | "vegan" | "non_vegetarian" | "eggetarian" | "other";
  allergies: string[];
  exercise_intensity: "beginner" | "intermediate" | "advanced";
  wake_time: string; // "HH:MM"
  sleep_time: string; // "HH:MM"
};

type NutritionInfo = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  is_estimate: true; // Always true; never omit this field
};

type ExerciseCategory =
  | "chest_toning" | "hip_lower_body" | "core" | "full_body"
  | "kegel_pelvic" | "stamina" | "facial" | "warmup"
  | "cooldown" | "stretching" | "mobility" | "posture"
  | "yoga" | "low_impact" | "recovery";

type WorkoutPhase = "warmup" | "main" | "cooldown";

type ReminderType =
  | "water" | "meal" | "movement" | "workout" | "bedtime"
  | "weight_log" | "progress_review";
```

## 8. Rate Limiting & Quotas

| Endpoint group | Limit | Window |
|----------------|-------|--------|
| Auth (register, login) | 5 requests | per minute per IP |
| General API | 200 requests | per minute per user |
| AI plan generation (meal, workout) | 20 requests | per day per user |
| AI chat | 50 messages | per day per user |
| Data export | 3 requests | per day per user |

**Rate limit response headers on every API response:**
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1761000000
Retry-After: 30   (only on 429 responses)
```

## 9. Idempotency, Caching & Concurrency

- **Idempotency keys:** POST `/tracker/water`, `/tracker/steps`, `/weight` accept an optional `Idempotency-Key: <uuid>` header. Duplicate keys within 24h return the original response (204 or 201).
- **Cache-Control:** Exercise library endpoints: `Cache-Control: public, max-age=86400`. All user-specific endpoints: `Cache-Control: private, no-store`.
- **ETag:** Weight history and recipe list endpoints return `ETag` headers for conditional GET support.
- **Optimistic concurrency:** `PATCH` operations on weight records, meal logs, and water entries include the record's `updated_at` timestamp; server rejects if stale (409 CONFLICT).

## 10. CORS & Security Headers

- **Allowed origins:** `NEXT_PUBLIC_APP_URL` only (no wildcard in production).
- **Required headers on all responses:**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: default-src 'self'; ...`
  - `Referrer-Policy: strict-origin-when-cross-origin`

## 11. Contract Testing

- Source of truth: this document. An OpenAPI 3.1 file (`openapi.yaml`) is generated from it and kept in sync.
- Backend testing: Supertest integration tests validate request/response shapes against Zod schemas derived from this contract.
- Frontend mock server: Mock Service Worker (MSW) in development and tests; Prism for contract validation.
- CI gate: Contract tests run on every pull request; failing contract tests block merge.

## 12. Breaking Change Policy

- Additive changes (new optional fields, new endpoints) are allowed within a version without a version bump.
- Breaking changes (removing fields, changing field types, changing required fields, removing endpoints) require a new version (`/v2`) and a documented migration guide.
- Deprecated fields are marked with `"deprecated": true` in the OpenAPI spec and removed no sooner than 90 days after the next version is available.

## 13. Change Log

| Date | Version | Endpoints affected | Change | Author |
|------|---------|-------------------|--------|--------|
| 2026-10-16 | 0.2 | All | Expanded endpoint index from 16 to 60+ endpoints covering all 10 modules. Added full definitions for AUTH-01/02, USER-02, BMI-01, WEIGHT-01/02, WATER-01/02, STEPS-02, SLEEP-02, SUMMARY-01, RECIPE-01/02, EXERCISE-01/02, WORKOUT-01/04/06, PROGRESS-01/02, AI-03, DASH-01. Added shared type definitions, rate limiting table, idempotency, caching, CORS, and contract testing sections. | |
