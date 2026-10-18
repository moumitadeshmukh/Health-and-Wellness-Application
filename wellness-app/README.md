# WellnessApp — local edition

A health, nutrition and fitness tracker built from the specs in the parent folder
(`goal-spec.md`, `frontend-spec.md`, `backend-spec.md`, `api-contract-spec.md`, `ai-spec.md`).

It needs **only Node.js**: no `npm install`, no database server and no accounts to set up.

## Run it

1. Install **Node.js 18 or newer** (LTS) from https://nodejs.org if you don't have it.
   Check by opening Command Prompt and typing `node -v`.
2. Start the app:
   - **Easiest (Windows):** double-click `start-windows.bat`
   - **Or in a terminal:**
     ```
     cd "C:\Agentic AI Project\wellness-app"
     npm start
     ```
3. Open **http://localhost:3000** and click **Get started** to create an account.

Keep the terminal window open while you use the app. Press `Ctrl + C` to stop it.

## What's included

| Spec feature | Where |
|---|---|
| F1 Sign-up, login, password reset, 5-step onboarding, profile | `/register`, `/login`, `/onboarding`, `/settings` |
| F2 BMI calculator + gauge, healthy range, weight log, goal, daily/weekly/monthly/yearly chart | `/bmi` |
| F3–F8 Steps, water (quick-add), meal diary with food search, sleep (overnight-aware), last meal, daily summary | `/tracker` |
| F9–F10 93 recipes (incl. 15 South Indian breakfasts, 20 healthy snacks) — ingredient-based recipe search (ranked by match, missing items flagged, allergy & diet filtering), recipe detail, serving adjuster, save, log as meal | `/recipes` |
| F11 Exercise library: 16 categories (incl. Diastasis Recti), 153 exercises (6+ per category), real coaching videos + animated demonstrations, exercise player with Start / Pause / Stop, filters, safety notes | `/exercises` |
| F12–F13 Workout planner (10–45 min, level, equipment, low-impact) — balanced or **one-category plans** (Core, Kegel, Yoga…), sessions with per-exercise player, timer and check-off, history | `/workout` |
| Ready-made **Workouts**: 10 themes × 20 / 30 / 45 min × 3 levels, guided hands-free player (Start / Pause / Stop / Skip / Previous, rests, sound cues), saved to history | `/workouts` |
| **Timed workouts (30 / 35 / 40 / 45 min)**: 10 categories (Full Body HIIT, Cardio Fat Burn, Core & Abs, Legs & Glutes, Arms & Posture, Strength & Tone, Low-Impact, Yoga Flow, Stretch & Mobility, Postnatal Core), timing options (30 s work · 15 s rest, 40/20, 45/15, 60/30 or mixed), warm-up + rounds + cool-down, countdown clock with automatic rests | `/workout`, `/workouts` |
| **14-Day Fit Glow Challenge**: one short (12–20 min) follow-along workout a day — HIIT, abs, legs, arms, cardio and stretch days — with levels, a no-jump version, progress ring and streak | `/workouts` (top section) |
| **Follow-along player**: big countdown ring, full-screen "NEXT UP" card during rests, voice coach, original workout beat, motivational cues, full-screen mode, confetti | every workout |
| **Diastasis recti programme**: Phase 1 / Phase 2 moves (breathing, TVA, heel slides, 90° heel taps, heel slide & leg lift, dead bug, modified plank), doming guidance, 40 s / 20 s postnatal timing | `/exercises?category=diastasis_recti` |
| **Diastasis Recti workouts** (Workouts page): follow-along 12-Min Ab Rehab (12 moves × 45 s) and a Gentle 12-Min Rehab for early recovery | `/workouts` |
| **Pelvic Floor · 20-Min Workout** (Workouts page): 22 Pilates-inspired pelvic floor & core moves, 45 s on / 10 s to switch | `/workouts` |
| **Well done!** pop-up after every workout with estimated calories burned (based on exercise type, time and your weight) — also saved to workout history | — |
| F14 Progress charts, streaks, milestones, insights | `/progress` |
| F15 Home dashboard | `/dashboard` |
| F16 Reminders + in-app notification centre (+ optional browser notifications) | `/settings/reminders` |
| F17–F19 AI meal plan, AI workout picks, Tiara chat with emergency keyword detection | `/recipes`, `/workout`, `/coach` |
| F20 Data export (JSON or CSV) and account deletion | `/settings/privacy` |
| F21 Installable, works offline for the app shell (service worker) | — |

## Open to everyone (no sign-in needed)

- **BMI check** on the home page: enter height (cm or ft/in) and weight (kg or lb) to see your BMI, whether it's in the healthy range, and the healthy weight range for your height.
- **Workouts** at `/workouts`: ready-made 20, 30 and 45-minute workouts that play hands-free from warm-up to cool-down.
- **Exercise Library** at `/exercises`: 120 exercises have a **real coaching video** of a woman demonstrating the move (switch to the animated guide any time), plus step-by-step instructions and safety notes.

## Exercise illustrations

Every exercise is demonstrated by the same original illustrated athlete, animated by a small skeleton engine:

- `public/js/skeleton.js` — fixed bone lengths (proportions can never stretch), joint-angle and inverse-kinematics
  posing (hands and feet stay planted on the floor, a wall or a bench), and in-between frames that rotate joints
  instead of sliding points.
- `public/js/poses.js` — one movement per exercise: camera view (front or side), start → movement → finish
  keyframes built from standard coaching cues, tempo (e.g. 2 s lowering, 1 s lifting), holds for planks and stretches,
  and an on-screen coaching cue for each phase ("Inhale · hips back & down", "Exhale · press up").
- `public/js/demo.js` — draws the athlete, props (wall, step, bench, chair, door frame, bike), the cue caption and
  the Slow / Normal speed control.

The artwork is generated in the browser, so there are no image files to license or download and it works offline.

## Real exercise videos

120 of the 153 exercises play a real coaching video, embedded from YouTube (privacy-enhanced `youtube-nocookie.com`
player, nothing is downloaded or copied). Each one was picked for a woman demonstrating that exact move, mostly from
trainers and physiotherapists such as Get Healthy U (Chris Freytag), Yoga With Adriene, Michelle Kenway (pelvic floor),
Joanna Soh, Well+Good, Ask Doctor Jo and Holly Perkins, and every link was checked to exist and allow embedding.

- **Exercise pages:** a *🎬 Real video / ✨ Animation* switch. The video is shown first, with the coach credited and an
  *Open on YouTube* link. The choice is remembered.
- **Follow-along workouts:** the *🎬 Real videos* toggle plays each move's video muted and on a loop, so the timer,
  beeps and voice coach stay in charge. Turn it off to see the animation.
- **Offline or no video:** the animation is used automatically (walks, cycling, circuits and a few gentle
  rehab moves have no single-move video).

Videos need an internet connection, and a channel can remove a video at any time. If one stops working, replace
its link in `src/data/exercise-videos.json` and restart the app:
```json
"bodyweight-squat": { "url": "https://www.youtube.com/watch?v=VIDEO_ID", "by": "Coach name" },
"plank": "/videos/plank.mp4"
```
The exercise id is the last part of the exercise page's address (e.g. `/exercises/bodyweight-squat`).
Your own `.mp4` files go in `public/videos/`.

## Other options

- **Dark mode:** Settings → Appearance
- **Export your data as CSV or JSON:** Settings → Privacy & Data
- Forms remember unfinished entries ("Draft restored") in your browser.

## Turn on the Claude AI coach (optional)

Without a key, Tiara answers common questions (snacks, South Indian meals, "is idli healthy?",
workouts by time, belly fat, diastasis recti, sleep, stress, BMI, your weekly progress) with links to
the app's recipes and workouts. To let it understand and answer **any** question:

1. Get an API key at https://console.anthropic.com/settings/keys (it starts with `sk-ant-`).
2. In the app, open **Settings → 💬 Tiara (AI)**, paste the key and press **Test & save**.

The key is tested, saved to `.env` in this folder, and used straight away. No restart is needed.

Only a short profile summary (first name, age, goals, 7-day averages) is sent to the AI. Your email is never sent.

## Your data

Everything is stored in `data/db.json` inside this folder.
- **Back up:** copy the `data` folder.
- **Start fresh:** run `npm run reset-data`. A backup copy of the old file is kept.
- **Password reset:** there is no email server, so the reset code is printed in the terminal window.

## How this differs from the specs

The specs target Next.js 14, Supabase (Postgres + Auth) and Prisma. This edition keeps the same
features, API routes (`/api/v1/...`, `snake_case`, `{data, meta}` / `{error}` shapes) and business rules,
but runs on plain Node.js with a JSON file database, so it starts with a single command.
The API layer in `src/routes.js` maps 1-to-1 onto the endpoint index in `api-contract-spec.md`,
so it can be ported to Next.js Route Handlers later.

```
server.js            HTTP server, static files, API dispatch
src/routes.js        all /api/v1 endpoints
src/logic.js         BMI, sleep, habits, recipe ranking, workout generation
src/ai.js            Tiara: Claude API + rule-based fallback, safety guardrails
src/data/            exercise library, recipes, food database
public/              single-page front end (vanilla JS modules, no build step)
```

## Troubleshooting

- **"Port 3000 is already in use":** close the other program, or put `PORT=3001` in `.env` and open http://localhost:3001.
- **"'node' is not recognized":** install Node.js, then close and reopen Command Prompt.
- **Page looks unstyled or blank:** hard-refresh with `Ctrl + F5`.

*WellnessApp provides general wellness information only and is not a substitute for professional medical advice.*
