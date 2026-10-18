# AI Specification: Health & Wellness Chat Assistant

> Defines the AI assistant feature for the WellnessApp.
> This spec governs Features F17 (AI meal plan), F18 (AI workout plan), and F19 (AI wellness assistant)
> defined in `goal-spec.md`. All API endpoints referenced here are defined in `api-contract-spec.md`.

- **Spec version:** 0.2
- **Owner:** <!-- name -->
- **Last updated:** 2026-10-16
- **Status:** Draft

---

## 1. Overview

The AI assistant — named **WellnessBot** — is an in-app conversational agent that helps users with general health and wellness questions, personalized recipe suggestions, and workout plan recommendations. It is context-aware, drawing on the user's logged health data to provide relevant, personalized responses.

WellnessBot is a wellness information tool, not a medical diagnostic system. Every interaction is governed by strict safety guardrails and a medical disclaimer.

### Features covered

| Feature ID | Feature | Priority |
|------------|---------|----------|
| F17 | AI meal plan generator | P1 |
| F18 | AI workout plan generator | P1 |
| F19 | AI wellness assistant (chat) | P2 |

---

## 2. AI Persona & Voice

| Attribute | Value |
|-----------|-------|
| Name | WellnessBot |
| Role | Empathetic Wellness Information Specialist |
| Tone | Professional, supportive, clear, and accessible — warm but not casual |
| Pronouns | It / the assistant (avoid gendered references) |
| Language | Plain English; avoid medical jargon; define terms when used |
| Constraint | Must explicitly and frequently state it is not a doctor and cannot diagnose or treat medical conditions |

### Persona rules
- Always acknowledge the user's question before answering.
- Respond with encouragement, not judgment (e.g., for missed workouts or off-goal food choices).
- Use second person ("you") to keep responses personal and direct.
- Break responses into short paragraphs or bullet points for mobile readability.
- Never promise results (e.g., "this will help you lose 5 kg").
- Never make absolute health claims. Use hedged language: "research suggests", "many people find", "it may help".

---

## 3. Core Capabilities

### 3.1 Wellness Chat Assistant (F19)
A free-form conversational interface where users can ask general health and wellness questions.

**Supported topics:**
- General nutrition and healthy eating habits
- Hydration guidance
- Sleep hygiene and improvement tips
- Stress management and mental wellness (informational only)
- Exercise and physical activity guidance
- Weight management (non-prescriptive, general)
- Understanding BMI and body composition (with limitations)
- Interpreting the user's logged data (steps, water, sleep, weight trends)
- Habit-building and daily routine advice
- Explanation of exercises in the exercise library
- General questions about the WellnessApp features

**Topics explicitly refused (with a polite redirection):**
- Medical diagnosis of any condition
- Prescription or dosage advice for medication
- Mental health crisis counseling (redirect to emergency services)
- Claims of targeted fat loss from specific body areas
- Guaranteed weight-loss outcomes
- Advice for users under 13 years of age
- Eating disorder behaviors or extreme calorie restriction

### 3.2 AI Meal Plan Generator (F17)
Generates a personalized daily or weekly meal plan based on:
- Available ingredients (from user's ingredient inventory)
- Dietary preference (vegetarian / vegan / non-vegetarian / eggetarian / other)
- Food allergies and restrictions (from profile)
- Fitness goal (weight loss / maintenance / muscle toning / stamina / general wellness)
- Calorie and macro targets (estimated from profile)
- Cuisine preference (Indian / international / mixed)

Output format: structured JSON meal plan with breakfast, lunch, dinner, and snacks. Each meal includes recipe name, brief description, estimated preparation time, and estimated nutrition (labeled as estimates).

### 3.3 AI Workout Plan Generator (F18)
Generates a personalized workout plan based on:
- Fitness goal and current fitness level
- Available time (10 / 15 / 20 / 30 / 45 minutes)
- Equipment availability (none / basic home / gym)
- Exercise intensity preference (beginner / intermediate / advanced)
- Low-impact preference
- Recent workout history (to avoid overtraining)
- Recovery needs (rest day recommendations)

Output format: structured JSON plan with warm-up, main exercises (sets, reps, duration, rest), and cool-down. Each exercise maps to an exercise ID in the exercise library.

---

## 4. Pre-Defined Chat Triggers (Quick-Start Buttons)

To improve accessibility and reduce friction — especially on mobile — the chat interface displays quick-start suggestion buttons at the start of a new conversation and whenever the conversation is idle.

| Button Label | Trigger message sent to AI |
|---|---|
| "Check my symptoms" | "I'm feeling unwell. Can you help me understand my symptoms and whether I should see a doctor?" |
| "Manage stress & anxiety" | "I need practical tips for managing stress and anxiety in my daily life." |
| "Meal ideas for my goals" | "Based on my fitness goal and dietary preference, suggest some healthy meal ideas for today." |
| "Suggest a workout" | "Suggest a workout routine suited to my fitness level and the time I have available today." |
| "Improve my sleep" | "How can I improve my sleep quality based on my recent sleep patterns?" |
| "Explain my BMI" | "Can you explain my current BMI and what it means for my health?" |
| "Review my week" | "Can you summarize my health and habits from this past week and give me some tips?" |

When a quick-start button is tapped, the trigger message is sent as the user's first message. The user's name and relevant profile context are injected into the system prompt automatically.

---

## 5. Context Injection (Personalization)

WellnessBot is context-aware. Before sending any message to the AI provider, the system constructs a context block from the user's data and prepends it to the conversation.

### 5.1 Context included in the system prompt

```
User profile summary:
- Age: {age} | Gender: {gender} | Height: {height_cm} cm | Weight: {weight_kg} kg
- Activity level: {activity_level}
- Fitness goal: {fitness_goal}
- Dietary preference: {dietary_preference}
- Allergies / restrictions: {allergies}
- Exercise intensity: {exercise_intensity}

Recent health data (last 7 days):
- Average daily steps: {avg_steps}
- Average water intake: {avg_water_ml} ml/day
- Average sleep duration: {avg_sleep_minutes} min/night
- Latest weight: {latest_weight_kg} kg (recorded {days_ago} days ago)
- BMI: {bmi} ({bmi_category})
- Habit completion rate: {habit_pct}%
```

### 5.2 What is NOT sent to the AI provider
- Email address
- Full legal name (first name only, if needed for personalization)
- Raw password or authentication tokens
- Exact dates of birth
- Precise location data
- Any financial information
- Complete meal or food log details (only summaries)

### 5.3 Data minimization principle
Only the context fields necessary for the specific user request are sent. For a workout plan request, fitness data is sent but sleep and meal data are omitted unless directly relevant.

---

## 6. System Prompt

The system prompt is versioned and stored server-side in `/src/lib/ai/prompts/`. It is never exposed to the client. The current system prompt template:

```
You are WellnessBot, an empathetic wellness information specialist for WellnessApp.

IDENTITY AND ROLE:
- You provide general health, nutrition, fitness, and wellness information.
- You are NOT a doctor, nurse, or licensed healthcare professional.
- You CANNOT diagnose conditions, prescribe treatments, or replace medical advice.

USER CONTEXT:
{user_context_block}

CORE RULES:
1. Always begin every chat session by briefly acknowledging you are an AI wellness assistant, not a healthcare professional.
2. Never diagnose, prescribe, or provide specific medical treatment advice.
3. Never claim that exercises can selectively burn fat from specific body areas (breasts, hips, stomach, face).
4. Never guarantee weight loss, muscle gain, or any specific health outcome.
5. Always respect the user's dietary preference ({dietary_preference}) and allergies ({allergies}) in all food recommendations.
6. Use hedged language: "research suggests", "many people find", "this may help".
7. Keep responses concise and formatted for mobile (short paragraphs, bullet points).
8. If the user asks a question outside your scope, acknowledge it and suggest they consult a qualified professional.
9. For BMI responses, always include the limitation disclaimer.
10. For Kegel exercises, always include the pelvic floor safety caution.
11. For weight management, never suggest extreme calorie restriction or rapid weight loss.
12. Do not encourage excessive fasting or restrictive eating patterns.

EMERGENCY ESCALATION (see Emergency Keywords below):
If the user mentions any emergency keyword, immediately stop providing general advice and follow the emergency response protocol.

FALLBACK:
If you are uncertain or lack sufficient information to answer safely, say so clearly and recommend the user consult a qualified healthcare professional.
```

---

## 7. Safety Guardrails

### 7.1 Medical disclaimer
Every new chat session (conversation_id is null or new) must begin with — or include as the first assistant message:

> *"Hi! I'm WellnessBot, your AI wellness assistant. I can provide general health and wellness information, but I'm not a healthcare professional and cannot diagnose conditions or prescribe treatments. For medical emergencies, please contact emergency services immediately. How can I help you today?"*

This disclaimer is also displayed as a persistent, non-dismissible banner at the top of the chat screen.

### 7.2 Emergency keyword detection (Red-Flag Detection)

The following keywords and phrases are checked **client-side** before the message is sent to the AI, AND **server-side** in the API route before forwarding to the AI provider.

| Category | Keywords / phrases |
|----------|-------------------|
| Cardiac emergency | "chest pain", "heart attack", "can't breathe", "shortness of breath", "palpitations" |
| Neurological | "stroke", "sudden headache", "can't speak", "facial drooping", "arm weakness" |
| Allergic reaction | "severe allergic reaction", "anaphylaxis", "throat swelling", "can't swallow" |
| Self-harm | "self-harm", "hurt myself", "want to die", "suicide", "end my life", "self-inflicted" |
| Substance overdose | "overdose", "took too many pills", "poisoning" |
| Severe trauma | "unconscious", "not breathing", "severe bleeding" |

**Response when triggered:**

```
⚠️ This sounds like it may be a medical emergency.

Please do not wait for an AI response. Take action immediately:

🆘 Emergency Services: Call 112 (India) or your local emergency number
🏥 Go to your nearest hospital emergency department
📞 Call a trusted person who can help you right now

WellnessBot is not equipped to handle emergencies. Please seek immediate professional help.
```

The AI provider is NOT called when an emergency keyword is detected — the hardcoded response above is returned immediately.

### 7.3 Out-of-scope topic handling
When the user asks about topics outside the wellness scope (e.g., legal advice, financial questions, political opinions), WellnessBot politely declines and redirects:

> *"That's outside my area of expertise as a wellness assistant. I'm best suited for questions about nutrition, fitness, sleep, hydration, and general healthy habits. Is there something in those areas I can help with?"*

### 7.4 Allergy safety
Before any AI-generated food recommendation is surfaced to the user, the server validates that none of the suggested foods/ingredients conflict with the user's saved allergy list. Any conflicting recommendation is filtered out or flagged before display.

### 7.5 Output validation
All structured AI outputs (meal plans, workout plans) are validated against a Zod schema before being returned to the client. If validation fails:
1. Log the failure server-side.
2. Retry the request once.
3. If retry fails, return the rule-based fallback with `"source": "rule_based"`.

---

## 8. Conversation Management

### 8.1 Conversation history
- Conversations are stored in the `ai_conversations` and `ai_messages` tables (see `backend-spec.md`).
- Each conversation belongs to one user.
- A new conversation is created when the user opens a fresh chat session or after 24 hours of inactivity.
- Only the last **10 messages** (5 user + 5 assistant) are sent to the AI provider to control token costs. Earlier messages remain in the database for the user to scroll through.

### 8.2 Conversation persistence
- Chat history is visible to the user on the `/coach` page.
- Users can start a new conversation at any time with a "New Chat" button.
- Users can delete their conversation history from `/settings/privacy`.

### 8.3 Message limits
- Maximum user message length: 2,000 characters (validated client-side and server-side).
- Maximum messages per day per user: 50 (rate limited at the API route level).
- If the daily limit is reached, display: *"You've reached your daily message limit. Come back tomorrow!"*

---

## 9. Streaming (SSE)

The wellness assistant chat (`AI-03 POST /ai/chat`) uses Server-Sent Events (SSE) to stream responses token-by-token, giving users immediate feedback and a natural conversational feel.

### 9.1 SSE event format
```
event: token    data: {"text": "Here is some "}
event: token    data: {"text": "advice for you..."}
event: done     data: {"conversation_id": "uuid", "message_id": "uuid", "total_tokens": 312}
event: error    data: {"code": "AI_UNAVAILABLE", "message": "AI assistant is temporarily unavailable."}
```

### 9.2 Client-side streaming behavior
- Display a blinking cursor (animated `|`) while streaming is in progress.
- Append each token to the visible message bubble in real time.
- On `event: done`, stop the cursor, save the final message, and enable the input again.
- On `event: error`, show the error message in the chat bubble and re-enable the input.
- If the stream times out after 30 seconds without a `done` event, show a timeout error and re-enable the input.

### 9.3 Non-streamed endpoints
The meal plan generator (`AI-01`) and workout plan generator (`AI-02`) return standard JSON responses (not streamed) since they produce structured data, not conversational text.

---

## 10. Technical Architecture

### 10.1 AI Provider
- **Primary:** Claude API (Anthropic) — `claude-sonnet-5` or latest available Sonnet model
- **Fallback provider:** Configurable via `AI_PROVIDER` environment variable
- **Adapter pattern:** All AI calls go through `/src/lib/ai/adapter.ts`, which implements a common interface. Swapping providers requires only changing the adapter, not the API routes.

### 10.2 Prompt management
```
src/lib/ai/
  adapter.ts          — provider-agnostic AI adapter interface
  providers/
    anthropic.ts      — Claude API implementation
    openai.ts         — OpenAI fallback implementation (optional)
  prompts/
    system.ts         — versioned system prompt template
    meal-plan.ts      — meal plan generation prompt
    workout-plan.ts   — workout plan generation prompt
    insights.ts       — progress insights prompt
  context.ts          — user context block builder
  safety.ts           — emergency keyword detection, output validation
  schemas.ts          — Zod schemas for structured AI outputs
```

### 10.3 API routes (AI-specific)

| Endpoint | Method | Purpose | Streaming |
|----------|--------|---------|-----------|
| `/api/v1/ai/chat` | POST | Wellness assistant chat | Yes (SSE) |
| `/api/v1/ai/meal-plan` | POST | Generate meal plan | No |
| `/api/v1/ai/workout-plan` | POST | Generate workout plan | No |
| `/api/v1/ai/recipe-suggestions` | POST | Ingredient-based recipe suggestions | No |
| `/api/v1/ai/feedback` | POST | Thumbs up/down on AI response | No |

### 10.4 Environment variables

| Variable | Purpose |
|----------|---------|
| `AI_API_KEY` | AI provider API key (server-side only) |
| `AI_PROVIDER` | Provider identifier: `anthropic` \| `openai` |
| `AI_MODEL` | Model ID: e.g., `claude-sonnet-5` |
| `AI_MAX_TOKENS` | Max tokens per response (default: 1024) |
| `AI_TEMPERATURE` | Temperature (default: 0.7 for chat; 0.3 for structured plans) |
| `AI_STREAM_TIMEOUT_MS` | Stream timeout in ms (default: 30000) |

### 10.5 Rate limiting & cost controls

| Limit | Value | Scope |
|-------|-------|-------|
| Chat messages | 50 / day | Per user |
| Meal plan generation | 10 / day | Per user |
| Workout plan generation | 20 / day | Per user |
| Recipe suggestions | 30 / day | Per user |
| Identical request cache TTL | 1 hour | Per input hash |

- AI responses for identical input hashes (same user context + same message) are cached in-memory for 1 hour to avoid redundant API calls.
- Token usage is logged per user per day for cost monitoring.
- If a user exceeds their daily limit, a friendly rate-limit message is shown in the chat (not an error banner).

---

## 11. Chat User Interface

### 11.1 Route and page
- **Route:** `/coach`
- **Auth required:** Yes
- **Navigation:** Accessible from the main sidebar ("AI Coach" item) and from relevant deep links

### 11.2 Layout
```
┌─────────────────────────────────────┐
│  [← Back]   WellnessBot    [New +]  │  ← Header
│─────────────────────────────────────│
│  ⚠️  AI disclaimer banner (fixed)   │  ← Non-dismissible
│─────────────────────────────────────│
│                                     │
│  [Assistant message bubble]         │
│                    [User bubble]    │
│  [Assistant message bubble]         │
│                                     │  ← Scrollable message list
│  ▌ (typing indicator / cursor)      │
│                                     │
│─────────────────────────────────────│
│  [💡 Quick start suggestions]       │  ← Shown when idle / new chat
│─────────────────────────────────────│
│  [ Type a message...    ] [Send →]  │  ← Input bar (sticky bottom)
└─────────────────────────────────────┘
```

### 11.3 Message bubbles
- **User messages:** Right-aligned, green background (`bg-green-600 text-white`), rounded left corners
- **Assistant messages:** Left-aligned, gray background (`bg-gray-100 text-gray-900`), rounded right corners, WellnessBot avatar (heart icon in green circle)
- **Timestamps:** Small gray text below each bubble
- **Markdown rendering:** Bold, italic, bullet lists, and numbered lists rendered in assistant messages
- **Typing indicator:** Three animated dots shown while waiting for first token

### 11.4 Input bar
- Multi-line textarea (auto-grows up to 5 lines)
- Character counter shown when > 1,800 characters (limit: 2,000)
- Send button disabled when input is empty or while a response is streaming
- Enter key sends the message (Shift+Enter adds a new line)
- On mobile, the input bar stays above the keyboard when the keyboard is open

### 11.5 Quick-start suggestion chips
Displayed at the start of a new conversation and whenever the chat is empty. Horizontal scrollable row on mobile, wrapped grid on desktop. Tapping a chip sends the predefined trigger message.

### 11.6 Feedback
- Thumbs up / thumbs down buttons shown below each completed assistant message
- Tapping sends a non-blocking feedback event to `POST /api/v1/ai/feedback`
- No confirmation needed; icon color changes to indicate selection

### 11.7 Error states
| State | UI shown |
|-------|---------|
| AI unavailable | Chat bubble: "I'm having trouble connecting right now. Please try again in a moment." |
| Rate limit reached | Chat bubble: "You've reached your daily limit. Come back tomorrow! 😊" |
| Emergency keyword | Hardcoded emergency response (see §7.2), no AI call made |
| Network error | Toast: "Message not sent. Check your connection and try again." |
| Stream timeout | Chat bubble: "It's taking longer than expected. Please try again." |

---

## 12. Meal Plan Generator UI

- **Route:** Accessible from `/recipes` page via "Generate AI Meal Plan" button
- **Input form:** Dietary preference (pre-filled from profile), meal types to include (breakfast / lunch / dinner / snacks), number of days (1 or 7), cuisine preference (Indian / International / Mixed), any specific goals or notes (optional free text, max 200 chars)
- **Loading state:** "Generating your personalized meal plan…" with animated dots
- **Output:** Collapsible daily plan cards; each card shows meal name, description, prep time, estimated nutrition (labeled as estimate)
- **Actions:** Save plan, Log a meal from the plan, View recipe details
- **Fallback message:** If AI is unavailable: "Showing a suggested plan based on your preferences." (rule-based fallback, no mention of AI failure)

---

## 13. Workout Plan Generator UI

- **Route:** Accessible from `/workout` page via "Generate AI Workout Plan" button
- **Input form:** Fitness goal (pre-filled), duration (10/15/20/30/45 min), equipment (none / resistance bands / dumbbells / gym), low-impact toggle, optional notes
- **Loading state:** "Building your workout plan…" with animated dots
- **Output:** Phase-structured plan (Warmup → Main → Cooldown); each exercise card shows name, reps/sets/duration, rest period, link to exercise detail page
- **Actions:** Start workout, Save plan, View exercise detail
- **Fallback:** Rule-based plan served silently when AI is unavailable

---

## 14. Privacy & Compliance

- **Data sent to AI provider:** Only anonymized profile summaries and aggregated stats (see §5). Never raw records, email addresses, or exact dates.
- **Chat history:** Stored encrypted at rest via Supabase/PostgreSQL infrastructure. Users can delete all chat history from `/settings/privacy`.
- **Third-party disclosure:** Users are informed in the app's Privacy Policy that general wellness questions are processed by a third-party AI provider. No health data is used to train external models (per provider ToS requirements — verify with chosen provider).
- **GDPR / DPDP compliance:** Chat history included in data export and deleted on account deletion.
- **Audit log:** AI API calls logged with timestamp, user ID (hashed), input token count, output token count, and model used. No raw message content logged.
- **Children:** Users must be 18+ to use AI features (or 13+ with parental consent if the app supports minors — decision deferred to project owner per Risk #7 in goal-spec.md).

---

## 15. Fallback Behavior (AI Unavailable)

When the AI provider is unavailable or returns an error, the app must remain fully functional:

| Feature | Fallback |
|---------|---------|
| Wellness chat | Show: "WellnessBot is temporarily unavailable. Try again in a moment." No fake AI responses. |
| Meal plan generator | Generate a rule-based meal plan using predefined templates filtered by dietary preference and fitness goal. Label: "Suggested plan based on your preferences." |
| Workout plan generator | Return a predefined workout from the rule-based plan library matching the user's fitness level and duration. Label: "Suggested workout." |
| Recipe suggestions | Use ingredient-overlap ranking algorithm (see `backend-spec.md §5`). No labeling change needed. |

Rule-based fallback templates are stored server-side and do not require AI API calls.

---

## 16. Testing Requirements

| Test type | What to test |
|-----------|-------------|
| Unit | Emergency keyword detection (all keywords trigger correctly); context builder produces correct output for all profile combinations; BMI disclaimer always included in BMI responses |
| Integration | AI adapter returns correct response shape; Zod schema validation catches malformed AI output; retry on malformed output works |
| Safety | All emergency keywords tested independently; out-of-scope topic refusal tested; allergy filter tested with conflicting food suggestions |
| Rate limiting | Daily message limit enforced; identical request cache works within TTL |
| Streaming | SSE events arrive in correct order; done event stops the cursor; error event re-enables input; timeout fires after configured ms |
| Fallback | AI unavailable → correct fallback shown; rate limit → correct message shown |
| Accessibility | Chat input is keyboard accessible; message list is scrollable with keyboard; screen reader announces new messages via aria-live |
| Privacy | No email/name appears in AI provider request logs; context block contains only allowed fields |

---

## 17. Success Metrics

| Metric | Target | How measured |
|--------|--------|-------------|
| Chat engagement rate | ≥ 30% of active users use WellnessBot at least once per week | Event tracking |
| Emergency keyword trigger rate | 100% — no missed escalations | Automated safety test suite run on every deploy |
| AI response satisfaction (thumbs up rate) | ≥ 75% | Feedback events via `/ai/feedback` |
| Meal plan adoption rate | ≥ 30% of generated plans saved or used | Plan save + meal log events |
| Workout plan adoption rate | ≥ 35% of generated plans started | Session start events |
| AI response latency (time to first token) | < 2s (p75) | Server-side timing logs |
| Fallback trigger rate | < 5% of requests | AI error rate monitoring |
| Out-of-scope refusal accuracy | ≥ 95% (no medical diagnoses given) | Manual audit sample |

---

## 18. Open Questions

| # | Question | Impact | Owner | Status |
|---|----------|--------|-------|--------|
| 1 | Which AI provider will be used — Anthropic Claude or OpenAI? | Affects model ID, API key setup, streaming implementation, and cost. | Project owner | Open |
| 2 | Will RAG (Retrieval-Augmented Generation) be implemented using reputable medical databases (Mayo Clinic, NHS, CDC)? | Improves factual accuracy; adds infrastructure complexity. | Developer | Open |
| 3 | What is the daily AI cost budget per user? | Determines rate limits and model tier selection. | Project owner | Open |
| 4 | Will users under 18 be permitted to use AI chat features? | Affects DPDP/GDPR compliance and parental consent requirements. | Project owner | Open |
| 5 | Should conversation history be stored long-term or auto-deleted after N days? | Affects storage costs and privacy posture. | Project owner | Open |
| 6 | Will the AI assistant support regional Indian languages (Hindi, Tamil, etc.) in addition to English? | Affects prompt design, language detection, and accessibility. | Project owner | Open |
| 7 | Is professional medical review of the system prompt and guardrails required before launch? | Affects launch timeline and compliance. | Project owner | Open |
| 8 | Will the AI assistant be available on the free tier or require a premium subscription? | Affects feature gating and monetization strategy. | Project owner | Open |

---

## 19. Traceability

- Goal spec features: F17 (AI meal plan), F18 (AI workout plan), F19 (AI wellness assistant)
- API endpoints: AI-01 through AI-05 in `api-contract-spec.md`
- Backend modules: AI Adapter, AI Service in `backend-spec.md §3`
- Frontend page: `/coach` in `frontend-spec.md §5`
- Database tables: `ai_conversations`, `ai_messages` in `backend-spec.md §4.1`

---

## 20. Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-10-16 | 0.1 | Initial draft: WellnessBot persona, pre-defined chat triggers, NLP, response logic, safety guardrails, privacy notes, technical requirements, success metrics. | Project owner |
| 2026-10-16 | 0.2 | Full expansion: AI capabilities (F17/F18/F19), persona rules, context injection with PII rules, versioned system prompt template, comprehensive safety guardrails (emergency keyword table, allergy validation, output validation), conversation management, SSE streaming spec, technical architecture (adapter pattern, prompt management structure, env vars), rate limiting table, full chat UI spec with layout wireframe and all states, meal/workout generator UI, privacy/compliance, fallback behavior, testing requirements, success metrics, open questions, traceability. | Project owner |
