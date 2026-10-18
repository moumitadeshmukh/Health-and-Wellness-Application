# Goal Spec

> Single source of truth for *why* we are building this and *what success looks like*.
> Frontend, backend and API specs must trace back to goals defined here.

- **Project:** AI-Powered Health, Nutrition & Fitness Web App
- **Spec version:** 0.3
- **Owner:** <!-- name -->
- **Last updated:** 2026-10-16
- **Status:** Draft

---

## 1. Vision

Build a modern, responsive, personalized health, nutrition, and fitness web application that works seamlessly on desktop, tablet, and mobile devices. The application helps users manage their daily nutrition, monitor weight and BMI, track healthy habits, discover recipes using ingredients available at home, and follow personalized exercise routines — all within a single, clean, attractive, and easy-to-use platform.

The primary goal is to provide users with a single platform to manage their overall health, fitness, nutrition, sleep, hydration, and daily physical activity through interactive dashboards, charts, progress reports, and personalized recommendations.

## 2. Problem Statement

People often struggle to manage their nutrition, weight, exercise routines, hydration, sleep, and daily physical activity because these activities are spread across multiple applications or tracked manually. Existing fitness applications may focus on only one aspect of wellness, offer generic recommendations, or require users to plan meals and workouts separately.

Users also need practical ways to prepare healthy meals using ingredients already available at home, understand their BMI and healthy weight range, monitor daily habits, and discover exercises suited to their fitness goals and experience levels.

This application addresses these challenges by bringing nutrition planning, ingredient-based recipe suggestions, weight management, daily health tracking, and categorized exercise routines into a single platform. It aims to make healthy living more accessible, personalized, and sustainable through actionable insights, progress tracking, and achievable daily goals.

## 3. Target Users / Personas

| Persona | Description | Primary goal | Key pain point |
|---------|-------------|--------------|----------------|
| Busy Professional | Working individuals with limited time to plan meals, exercise, and maintain healthy daily routines. | Maintain a healthy lifestyle through quick recipes, short workouts, and daily habit tracking. | Lack of time, inconsistent routines, and difficulty tracking health activities across multiple apps. |
| Fitness Beginner | Individuals starting their fitness journey who need simple, structured guidance. | Improve fitness, manage weight, build stamina, and develop sustainable exercise habits. | Uncertainty about which exercises to perform, how to perform them correctly, and how to track progress. |
| Weight Management Seeker | Individuals who want to understand their BMI, monitor weight changes, and work toward realistic fitness goals. | Track weight, understand a healthy weight range, and follow sustainable nutrition and exercise plans. | Confusion about BMI, unrealistic weight-loss advice, and difficulty maintaining consistency. |
| Home Cook / Health-Conscious Eater | Individuals who prepare meals at home and want to make nutritious dishes with available ingredients. | Discover suitable recipes, reduce food waste, and make balanced meals based on dietary preferences. | Not knowing what to cook with available ingredients or how to estimate the nutritional value of meals. |
| Health-Conscious Routine Builder | Individuals who want to improve everyday habits, including hydration, sleep, walking, and meal timing. | Build consistent daily routines and understand patterns in their lifestyle. | Forgetting to log activities, inconsistent sleep and hydration, and limited visibility into long-term habits. |
| Targeted Fitness Enthusiast | Individuals interested in specific fitness outcomes such as core strength, lower-body conditioning, chest strengthening, full-body toning, pelvic floor exercises, or stamina improvement. | Find categorized exercises and follow structured routines suited to their fitness level. | Difficulty finding reliable instructions, safe modifications, and appropriate workout plans for specific goals. |

## 4. Goals & Non-Goals

### Goals
- G1: Build a responsive web application that works on desktop, tablet, and mobile devices with intuitive navigation.
- G2: Enable users to calculate BMI, view an approximate healthy weight range, set weight goals, and track weight changes over time.
- G3: Allow users to track daily steps, water intake, food intake, sleep time, wake-up time, and last meal time.
- G4: Recommend recipes — including Indian and international home-cooked meals — using ingredients available at home, with cooking instructions and estimated nutritional information.
- G5: Provide a categorized exercise library covering chest toning, hip and lower-body, core, full-body toning, Kegel and pelvic floor, stamina, facial exercises, warm-up, cool-down, stretching, mobility, posture, beginner yoga, low-impact workouts, and rest and recovery.
- G6: Generate personalized workout plans and meal recommendations based on user preferences, fitness levels, dietary restrictions, available time, and goals.
- G7: Display progress charts, daily goals, habit tracking, habit streaks, and optional reminders.
- G8: Protect user data through secure authentication, access controls, data export, and data deletion functionality.
- G9: Provide health insights and progress reports with practical, encouraging recommendations based on recorded data.
- G10: Deliver a clean, modern, accessible, and easy-to-use interface for users with different levels of technical knowledge.

### Non-Goals (explicitly out of scope)
- NG1: Developing separate native Android and iOS applications in the initial release.
- NG2: Providing medical diagnosis, prescribing medication, or replacing professional medical advice.
- NG3: Guaranteeing weight loss or claiming that exercises can selectively eliminate fat from specific body areas (breasts, hips, stomach, face).
- NG4: Providing real-time medical monitoring or emergency health alerts.
- NG5: Training custom AI models from scratch.
- NG6: Integrating all wearable devices and healthcare platforms in the MVP.
- NG7: Making paid AI services mandatory for basic health tracking and calculations.
- NG8: Automatic food recognition from photographs in the initial release.

## 5. Core Features (MVP)

| ID | Feature | Description | Priority | Linked goal |
|----|---------|-------------|----------|-------------|
| F1 | User authentication & profile | Secure registration, login, profile management: full name, age, gender (optional), height, current weight, fitness goals (weight loss / maintenance / muscle toning / stamina improvement / general wellness), activity level (sedentary / lightly active / moderately active / very active), dietary preference (vegetarian / vegan / non-vegetarian / eggetarian / other), food allergies and dietary restrictions, preferred exercise intensity (beginner / intermediate / advanced), and daily wake-up and sleep schedule. | P0 | G1, G8 |
| F2 | BMI & weight management | Calculate BMI using the standard adult formula, display BMI value and category (underweight / healthy weight / overweight / obesity), show healthy weight range for the user's height, display current vs. target weight, set realistic weight goals, maintain daily/weekly/monthly/yearly weight history, interactive weight charts, and healthy sustainable weight management suggestions. | P0 | G2 |
| F3 | Daily steps tracker | Manual step entry, personalized daily step goal, progress indicator and bar, weekly and monthly activity charts, optional health platform integration (clearly distinguish manual vs. synced data). | P0 | G3 |
| F4 | Water intake tracker | Log water consumption with quick-add buttons (150 ml / 250 ml / 500 ml / custom), daily total and hydration goal progress, visual progress indicator, edit or delete incorrect entries. Hydration targets are adjustable and presented as general guidance. | P0 | G3 |
| F5 | Food intake & meal diary | Log breakfast, lunch, dinner, snacks, and beverages; manual food entry and recipe-based meal logging; estimated calories and macronutrients when reliable data is available; daily nutrition summaries; searchable food history; edit or delete food records. | P0 | G3 |
| F6 | Sleep tracker | Record wake-up time and bedtime, calculate sleep duration (including overnight sleep), sleep history and weekly averages, preferred sleep schedule, sleep-habit suggestions and gentle reminders. | P0 | G3 |
| F7 | Last meal tracker | Record time of last meal each day, display elapsed time since last recorded meal, optional reminders based on preferred meal schedule. Does not encourage excessive fasting or restrictive eating. | P0 | G3 |
| F8 | Daily activity summary | Dashboard overview: steps completed, water consumed, meals recorded, estimated calorie and nutrient intake, sleep duration, wake-up time, last meal time, current weight (when recorded), exercise sessions completed, and overall habit completion percentage. | P0 | G3, G7 |
| F9 | Ingredient-based recipe generator | Ingredient search and selection interface, manual ingredient entry, searchable ingredient database, avoid-ingredient option, meal type selection (breakfast / lunch / dinner / snacks / beverages), dietary preference support (vegetarian / vegan / egg-based / non-vegetarian), nutrition preferences (high-protein / high-fiber / low-added-sugar / balanced / weight-management-friendly), recipes ranked by ingredient availability, missing ingredients identified separately, Indian and international recipes including common Indian home-cooked meals. | P0 | G4 |
| F10 | Recipe details | Name and image, ingredients and quantities, step-by-step cooking instructions, preparation and cooking times, serving size, estimated calories per serving, protein/carbs/fats/fiber/other nutritional information (labeled as estimates), difficulty level, dietary tags, suggested meal category, save favorite recipes, view recipe history, adjust serving sizes. | P0 | G4 |
| F11 | Exercise library | Categorized exercises: (A) chest toning — wall push-ups, knee push-ups, standard push-ups, dumbbell chest press, chest fly, incline push-ups; (B) hip and lower-body — squats, glute bridges, lunges, side leg raises, clamshells, step-ups, hip thrusts; (C) core — planks, side planks, dead bugs, bird dogs, bicycle crunches, reverse crunches, mountain climbers; (D) full-body toning — bodyweight circuits for beginner / intermediate / advanced; (E) Kegel and pelvic floor — identification guidance, beginner routines, correct contraction/relaxation, reps, rest, progression; (F) stamina — brisk walking, beginner jogging, cycling, low-impact aerobics, marching, step exercises, interval walking; (G) facial exercises — gentle mobility, relaxation, jaw movements; (H) additional — warm-up, cool-down, stretching, mobility, posture improvement, beginner yoga, low-impact workouts, rest and recovery. Each exercise includes: name, illustration or video, target muscles, step-by-step instructions, form and breathing guidance, beginner modifications, reps/sets/duration, rest periods, difficulty, equipment, safety precautions, common mistakes. Filters by category, difficulty, duration, equipment, and fitness goal. | P0 | G5 |
| F12 | Personalized workout planner | Recommend routines based on fitness goal, current fitness level, available time (10 / 15 / 20 / 30 / 45 minutes), exercise preferences, available equipment, previous workout history, and recovery needs. Daily and weekly workout plans with warm-ups, main exercises, rest intervals, and cool-downs. Beginner / intermediate / advanced options. Low-impact alternatives available. | P0 | G5, G6 |
| F13 | Workout tracking | Create personalized workout plans, mark exercises as completed, record workout duration, track progress over time, view weekly workout schedules and workout history. Optional exercise reminders. | P0 | G5, G7 |
| F14 | Progress dashboard & insights | Weight trends, step averages, water intake consistency, sleep duration trends, meal logging consistency, exercise completion rate, workout duration trends, frequently prepared recipes, habit streaks and milestones, weekly summaries. Interactive charts, progress bars, and calendars. Practical encouraging recommendations. | P0 | G7, G9 |
| F15 | Home dashboard | Welcome message, current weight and BMI, daily step progress, water intake progress, today's meals summary, sleep summary, last meal time, today's workout plan, quick ingredient-to-recipe search, daily goals and reminders, weekly progress charts. Sidebar navigation on desktop; compact bottom navigation on mobile. | P0 | G1, G7, G10 |
| F16 | Reminders & notifications | Optional reminders for: drinking water, recording meals, movement breaks, completing workouts, preparing for bedtime, logging daily weight, reviewing daily progress. Customizable notification times, frequency, and preferences. Browser notifications and in-app notification center. | P1 | G7 |
| F17 | AI meal plan generator | Generate personalized meal ideas based on available ingredients, dietary preferences, allergies, and fitness goals via AI API with rule-based fallback. | P1 | G4, G6 |
| F18 | AI workout plan generator | Generate daily and weekly workout plans via AI API based on fitness level, goals, equipment, and available time. Rule-based fallback when AI is unavailable. | P1 | G5, G6 |
| F19 | AI wellness assistant | Answer general wellness questions and explain progress with appropriate health and safety limitations. Streamed responses. Rule-based fallback. | P2 | G6, G9 |
| F20 | Data export & account deletion | Export personal records (JSON or CSV), request and confirm deletion of account and associated data per a documented data deletion policy. | P0 | G8 |
| F21 | PWA support | Installable on compatible devices, optional offline functionality when implemented and tested. | P2 | G1 |

## 6. AI Capabilities

- **Use cases:** Recipe recommendations from available ingredients, personalized workout plan generation, meal plan generation, habit pattern analysis, progress summaries, ingredient substitutions, and general wellness questions.
- **Model / provider:** Configurable external AI API (selected by cost, reliability, privacy, and API availability). Keep the integration modular so the provider can be changed later.
- **Inputs to the model:** Relevant user profile, fitness goals, dietary preferences, allergies, available ingredients, exercise preferences, available equipment, and authorized health-tracking records — minimized to what is necessary for the specific request.
- **Guardrails:** No medical diagnosis, no medication advice, no extreme diets, no guaranteed weight-loss claims, no localized fat-reduction claims (breasts, hips, stomach, face), no unsafe fasting recommendations. Allergy list checked after AI output before surfacing. AI outputs validated against schemas before display. BMI limitations always disclosed. Kegel exercises include pelvic floor health caution.
- **Privacy:** Send only the minimum necessary information. Never expose API keys or service credentials in frontend code.
- **Fallback behavior:** Rule-based recipe matching (ranked by ingredient overlap) and predefined workout templates when AI services are unavailable. BMI calculations, health tracking, and progress dashboards remain fully functional without AI.

## 7. User Stories & Acceptance Criteria

### US-1: User Registration & Profile
- **As a** new user, **I want** to create an account and enter my preferences **so that** the application can personalize my experience.
- **Acceptance criteria:**
  - [ ] Given valid registration details, when I submit the form, then my account is created and I can sign in.
  - [ ] Given an authenticated session, when I update my profile (name, age, height, weight, goal, activity level, dietary preference, allergies, exercise intensity, sleep schedule), then my changes are validated and saved.
  - [ ] Given an unauthenticated user, when they attempt to access protected records, then access is denied.
  - [ ] Given an onboarding flow, when I complete it, then the dashboard reflects my profile and personalized goals.

### US-2: BMI & Weight Tracking
- **As a** fitness-conscious user, **I want** to calculate my BMI and record my weight **so that** I can monitor changes over time.
- **Acceptance criteria:**
  - [ ] Given valid height and weight, when I calculate BMI, then the application displays the correct result, category, and a BMI limitation disclaimer.
  - [ ] Given a saved weight record, when I view my history, then the record appears in the weight chart with daily, weekly, monthly, and yearly views.
  - [ ] Given a valid height, when I request a healthy weight range, then the application calculates an approximate range using standard adult BMI references.
  - [ ] Given a weight goal set by the user, when I open the BMI section, then I see current vs. target weight.
  - [ ] Given invalid or missing measurements, when I submit the form, then the application displays a validation message.

### US-3: Daily Health Tracking
- **As a** health-conscious user, **I want** to record my steps, water intake, meals, and sleep schedule **so that** I can maintain healthy daily habits.
- **Acceptance criteria:**
  - [ ] Given a water intake entry, when I save it using a quick-add button or custom amount, then the daily total and progress indicator update correctly.
  - [ ] Given a valid step count, when I save it, then the count appears in my daily summary and the step chart.
  - [ ] Given bedtime and wake-up time, when both are recorded, then the application calculates sleep duration correctly, including overnight sleep.
  - [ ] Given a last meal time, when I save it, then the elapsed time since last meal is displayed and updated.
  - [ ] Given an existing entry, when I edit or delete it, then the daily totals are recalculated.
  - [ ] Given the end of the day, when I open the daily summary, then I see all tracked habits and overall habit completion percentage.

### US-4: Ingredient-Based Recipe Finder
- **As a** home cook, **I want** to enter ingredients I have at home **so that** I can find suitable recipes.
- **Acceptance criteria:**
  - [ ] Given multiple ingredients, when I search, then the application displays matching recipes ranked by ingredient availability.
  - [ ] Given a recipe, when I open its details, then I can view all recipe information including nutrition estimates labeled as estimates.
  - [ ] Given missing ingredients, when recipe results appear, then the application identifies them clearly.
  - [ ] Given dietary restrictions and allergies, when I search, then incompatible recipes are excluded where ingredient information is reliable.
  - [ ] Given Indian ingredients (e.g., dal, rice, roti, poha, upma, idli, dosa), then relevant Indian recipes appear in results.
  - [ ] Given an AI service failure, when I search for recipes, then rule-based matching remains available.
  - [ ] Given a recipe, when I adjust the serving size, then ingredient quantities and nutrition estimates recalculate correctly.

### US-5: Exercise Library
- **As a** fitness beginner, **I want** to browse exercises by category and goal **so that** I can find appropriate exercises and learn the correct techniques.
- **Acceptance criteria:**
  - [ ] Given an exercise category, when I select it, then the application displays relevant exercises.
  - [ ] Given an exercise, when I open its details, then I can view instructions, difficulty, repetitions or duration, modifications, rest periods, safety precautions, and common mistakes.
  - [ ] Given filters for category, difficulty, duration, equipment, or goal, when I apply them, then results reflect my selections.
  - [ ] Given exercises targeting specific body areas, then the application explains that strengthening targeted muscles does not guarantee localized fat loss.
  - [ ] Given Kegel exercises, then the application includes a caution that they are not appropriate for everyone and recommends consulting a pelvic health professional when pain or symptoms are present.

### US-6: Personalized Workout Planner
- **As a** user improving my fitness, **I want** a workout plan suited to my fitness level and available time **so that** I can exercise consistently.
- **Acceptance criteria:**
  - [ ] Given a fitness goal, fitness level, and workout duration (10 / 15 / 20 / 30 / 45 min), when I generate a plan, then the application provides a routine with warm-up, main exercises, rest intervals, and cool-down.
  - [ ] Given a workout plan, when I mark an exercise as completed, then the completion is recorded.
  - [ ] Given completed workouts, when I view my history, then the workouts appear in my activity records.
  - [ ] Given an AI generation failure, when I request a workout, then a predefined rule-based routine is offered.
  - [ ] Given a low-impact preference, when I generate a plan, then low-impact alternatives are included.

### US-7: Progress Dashboard
- **As a** health-conscious user, **I want** to review my daily and weekly progress **so that** I can understand my habits and remain motivated.
- **Acceptance criteria:**
  - [ ] Given recorded health data, when I open the progress section, then I see weight trends, step averages, water consistency, sleep trends, meal logging, and exercise completion.
  - [ ] Given historical records, when I select a time range, then the application displays the corresponding charts.
  - [ ] Given missing data, when I view a dashboard section, then the application displays an appropriate empty state.
  - [ ] Given habit streaks and milestones, then the dashboard highlights them with encouraging messages.
  - [ ] Given updated or deleted records, when the dashboard refreshes, then totals and charts reflect the changes.

### US-8: Reminders & Notifications
- **As a** user, **I want** to receive optional reminders **so that** I can maintain consistent healthy habits.
- **Acceptance criteria:**
  - [ ] Given customized reminder settings, when the scheduled time arrives, then a browser or in-app notification is shown.
  - [ ] Given updated notification preferences, when I save them, then reminders reflect the new settings.
  - [ ] Given a user who has opted out of reminders, when the scheduled time arrives, then no notification is sent.

### US-9: Data Privacy & Security
- **As a** registered user, **I want** to control my personal information **so that** I can manage my data securely.
- **Acceptance criteria:**
  - [ ] Given an authenticated user, when they request personal records, then only authorized records are returned.
  - [ ] Given a data export request, when the export is prepared, then the user can retrieve only their own records.
  - [ ] Given a confirmed account deletion request, when deletion is processed, then the application follows its documented data deletion policy.
  - [ ] Given any security-sensitive operation, when it is processed, then authentication, authorization, and validation checks are applied.

## 8. Success Metrics (KPIs)

| Metric | Target | How measured |
|--------|--------|--------------|
| Activation (first meaningful log within 24h) | ≥ 60% | Percentage of new users who record a weight, meal, water intake, steps, or workout within 24 hours. |
| 7-day retention | ≥ 25% | Percentage of activated users who return during days 6–8 after registration. |
| 30-day retention | ≥ 15% | Percentage of activated users who return during days 27–33 after registration. |
| Recipe recommendation satisfaction | ≥ 80% positive | Percentage of submitted recipe ratings marked useful. |
| AI plan adoption rate | ≥ 30% | Percentage of users who generate an AI plan and save or start using it. |
| Core feature success rate | ≥ 95% | Percentage of valid core operations completing successfully. |
| Page load (LCP) | < 2.5s | 75th percentile of real-user page loads where available. |
| Cumulative Layout Shift (CLS) | < 0.1 | Core Web Vital measured via real-user monitoring. |
| Critical application error rate | < 1% | Percentage of core operations failing due to unexpected application errors. |
| Unauthorized data access | 0 known incidents | Security testing, authorization tests, and incident monitoring. |
| Daily habit completion | ≥ 40% of active users log ≥ 3 habits/day | Percentage of users logging steps, water, meals, or sleep on active days. |

## 9. Constraints & Assumptions

- **Tech stack (confirmed):** React, Next.js 14+, TypeScript, Tailwind CSS, PostgreSQL, Supabase (auth + database + storage), Prisma ORM, Recharts.
- **AI integration:** External AI API through server-side endpoints only. Provider is configurable and modular. Core application must remain functional without AI.
- **Nutrition data:** Use a reliable food and nutrition API or curated database (e.g., USDA FoodData Central, Open Food Facts, or Edamam). Nutritional estimates must be labeled as estimates.
- **Exercise media:** Licensed instructional images or videos only.
- **Recipe data:** Include Indian and international recipes. Indian home-cooked meals (dal, roti, rice, sabzi, khichdi, poha, upma, idli, dosa, and other regionally relevant dishes) must be represented.
- **Development environment:** VS Code as primary editor, Git for version control.
- **Configuration:** Secrets in environment variables. Provide `.env.example` with placeholder values only. Never commit real API keys.
- **Testing:** Unit tests, integration tests, responsive UI tests, and end-to-end tests for important user flows.
- **Development phases:**
  - Phase 1 (Foundation): Responsive UI, user registration and profile, dashboard, BMI calculator and weight history, daily tracking.
  - Phase 2 (Nutrition): Ingredient inventory, recipe recommendations, meal diary, nutritional summaries.
  - Phase 3 (Fitness): Searchable exercise library, exercise instructions and categories, workout planner, workout tracking.
  - Phase 4 (Insights): Progress charts, habit tracking, personalized recommendations, reminders and notifications.
  - Phase 5 (Production Readiness): Security and privacy checks, responsive testing, accessibility testing, error handling, performance optimization, deployment documentation.
- **Budget / AI cost limits:** Essential tracking features must work independently of paid AI services. Configure API usage limits per user. Avoid unnecessary AI requests.
- **Assumptions:** Users initially enter steps and health records manually unless integrations are implemented. Nutritional information uses reliable data sources. AI-generated recommendations are advisory and subject to validation. Exercise images and videos must be appropriately licensed.

## 10. Compliance, Privacy & Safety

- **Health data:** Collect only necessary information, explain its use, obtain appropriate consent, and provide data access, export, and deletion options.
- **Regulations:** Assess India's Digital Personal Data Protection Act and applicable rules. Consider GDPR when applicable. Evaluate HIPAA only if the application falls within its legal scope.
- **Medical disclaimer:** The application provides general wellness information and does not diagnose or treat medical conditions. Display prominently.
- **BMI safety:** BMI is a screening tool and does not directly measure body fat or determine an individual's complete health status. Use age-appropriate assessment methods for children and teenagers rather than adult BMI categories.
- **Exercise safety:** Provide step-by-step instructions, beginner modifications, and relevant safety precautions. Never guarantee results or claim localized fat loss from specific body areas (breasts, hips, stomach, face). Kegel exercises include a caution that they are not appropriate for everyone, particularly people with an overactive or excessively tense pelvic floor; recommend consulting a qualified pelvic health professional when pain or pelvic floor symptoms are present.
- **Weight management:** Do not prescribe extreme diets or rapid weight-loss targets. Suggestions must be healthy and sustainable.
- **Fasting guidance:** The last meal tracker does not encourage excessive fasting or restrictive eating patterns.
- **Data encryption:** HTTPS in transit, appropriate encryption at rest via database and hosting infrastructure.
- **Access control:** Users can access only their own records. Server-side authorization and database row-level security enforced.
- **AI privacy:** Minimize personal information sent to AI providers. Disclose relevant third-party processing. Never send unnecessary PII.
- **Secret management:** API keys and privileged credentials kept out of frontend code and version control at all times.
- **Testing:** Test authentication, authorization, input validation, data deletion, and error handling. Avoid logging unnecessary sensitive health information.

## 11. Risks & Open Questions

| # | Risk / Question | Impact | Owner | Status |
|---|-----------------|--------|-------|--------|
| 1 | Which AI provider will be used? | Affects cost, privacy, and recommendation quality. | Project owner | Open |
| 2 | Will step tracking initially be manual or integrated with health platforms? | Affects implementation scope and compatibility. | Project owner | Open |
| 3 | Which nutrition database or API will be used? | Affects nutritional accuracy and recipe usefulness. | Developer | Open |
| 4 | How will exercise images and videos be sourced and licensed? | Affects content quality and legal compliance. | Project owner | Open |
| 5 | What is the development budget and target launch date? | Affects priorities and deployment decisions. | Project owner | Open |
| 6 | Which deployment platform will be selected (Vercel, Railway, etc.)? | Affects infrastructure and CI/CD design. | Developer | Open |
| 7 | Will users under 18 be supported? | Affects BMI interpretation, safety, and privacy requirements. | Project owner | Open |
| 8 | How will allergies and exercise limitations be handled when AI is unavailable? | Affects recommendation safety in fallback mode. | Developer | Open |
| 9 | What data retention and deletion policies will apply? | Affects privacy and compliance. | Project owner | Open |
| 10 | Which features should work offline (PWA Phase 2)? | Affects PWA implementation scope and data synchronization. | Project owner | Open |
| 11 | Will a push notification service be needed for mobile reminders? | Affects notification architecture. | Developer | Open |
| 12 | Which Indian recipe database or curated dataset will be used? | Affects recipe coverage and Indian cuisine accuracy. | Developer | Open |

## 12. Traceability

- Frontend spec: `frontend-spec.md`
- Backend spec: `backend-spec.md`
- API contract: `api-contract-spec.md`

## 13. Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-10-16 | 0.2 | Updated goals, MVP features, AI capabilities, user stories, KPIs, constraints, privacy, risks, and traceability. | Project owner |
| 2026-10-16 | 0.3 | Full expansion: vision filled in; 10 goals; 21 features across 10 modules; 9 user stories with detailed acceptance criteria; Indian recipe requirement; Kegel safety notes; exercise localized fat-loss disclaimers; 5-phase development plan; updated KPIs, constraints, risks, and compliance sections. | Project owner |
