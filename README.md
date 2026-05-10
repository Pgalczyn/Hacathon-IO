# Unilearn (Hacathon-IO)

A self-learning web app: tell it what you want to learn and it builds a personalized **7-day plan** plus a **12-month roadmap on a calendar**, sourcing real materials from YouTube, Project Gutenberg and OpenAlex. After each week it generates a summary and a short quiz, regrades into the next plan, and lets you talk to an AI tutor about what you covered.

This is a hackathon project.

## How it works

1. **Sign up.** Username, email, password — JWT cookie session.
2. **Questionnaire (`/learningform`).** Goal text, current level (beginner → advanced), daily time budget, preferred material formats (video / article / book / course / podcast).
3. **Goal validation.** The LLM screens the goal and rejects ones that are illegal, harmful, manipulative, frivolous (stunts, get-rich-quick, vanity wishes), explicit, or too vague. Rejection messages are always in English.
4. **Plan generation.** On accept, the backend produces:
   - a **7-day plan** (`Plan` model) — each task has a day, format, title, source, duration, description, and a "why this fits you" line, with a real URL fetched from YouTube / Gutendex / OpenAlex (or a Google search fallback so every card is clickable);
   - a **12-month roadmap** (`LongTermPlan` model) — 12 months × ~20 tasks/month, scheduled day-by-day on a calendar that starts on today's date.
5. **Daily view.** Home shows "Today's Focus" — just the tasks for today's day-of-plan.
6. **Per-task ratings.** After each material the user rates it (1-5), says whether it was helpful and how the difficulty felt. Negative reviews steer next-week recommendations.
7. **End of week.** `/weeklysummary` produces a short markdown recap + a 3-4 question quiz (mix of MCQ and open-ended). Quiz answers feed into the next plan: missed concepts get re-taught, perfect scores push difficulty up.
8. **Tutor.** `/conversation` opens a freeform chat with an AI tutor that has the latest plan in context.

## Tech stack

**Backend** — Node.js · TypeScript (ESM, strict) · Express 5 · Mongoose (MongoDB Atlas) · LangChain (Anthropic Claude Sonnet 4.6 — falls back to Groq Llama) · Zod 4 · JWT + bcrypt · YouTube Data API v3 · OpenAlex · Gutendex
**Frontend** — React 19 · Vite · React Router v7 · Bootstrap 5

## Project layout

```
.
├── BACKEND/
│   └── src/
│       ├── server.ts            # Express entrypoint
│       ├── app.ts               # router wiring
│       ├── controllers/         # auth, plan, onboarding, review, weeklySummary, conversation, longTermPlan, materials
│       ├── routes/
│       ├── services/            # business logic (onboarding, plan, recommendation, materials, weeklySummary, ...)
│       ├── models/              # Mongoose: User, Plan, LongTermPlan, Review, WeeklySummary, QuizAttempt, Conversation
│       ├── llm/                 # provider, structured output, schemas, weekly plan, yearly plan, summary, conversation
│       ├── sources/             # YouTube / Gutendex / OpenAlex strategy adapters
│       ├── middleware/          # auth (required + optional)
│       └── scripts/
│           └── wipe-user-data.ts  # clear plans/summaries/reviews without nuking users
├── FRONTEND/
│   └── src/components/          # Home, LearningForm, PlanView, DayView, LongTermPlan (calendar),
│                                # WeeklySummary, Conversation, MyProfile, WelcomeStartCard, ...
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20+
- MongoDB (Atlas connection string is fine)
- An API key for one LLM provider:
  - **Anthropic** (recommended — `claude-sonnet-4-6`, fastest + most stable, https://console.anthropic.com), or
  - **Groq** (free tier, https://console.groq.com — works but the Llama tool-call validator occasionally rejects valid plans)
- A YouTube Data API v3 key (for video materials)

## Setup

```bash
# 1. Install dependencies (runs in both BACKEND/ and FRONTEND/)
cd BACKEND && npm install
cd ../FRONTEND && npm install

# 2. Create a .env file in the repo root
cat > .env <<'EOF'
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/?appName=Hackaton-FREE
JWT_SECRET=replace-me-with-something-long-and-random
PORT=3000

# Anthropic (recommended)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=sk-ant-api03-...

# OR Groq fallback
# LLM_PROVIDER=groq
# LLM_MODEL=llama-3.3-70b-versatile
# GROQ_API_KEY=gsk_...

YOUTUBE_API_KEY=AIza...
EOF

# 3. Run both dev servers (in two terminals)
cd BACKEND && npm run dev      # http://localhost:3000
cd FRONTEND && npm run dev     # http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `cd BACKEND && npm run dev` | Backend with `tsx watch` (auto-reload) |
| `cd FRONTEND && npm run dev` | Vite dev server with HMR |
| `cd BACKEND && npx tsc --noEmit` | Type-check the backend |
| `cd BACKEND && npx tsx src/scripts/wipe-user-data.ts` | Clear plans, summaries, reviews, conversations (keeps users) |
| `cd BACKEND && npx tsx src/test-plan.ts` | Run the plan generator against 14 sample goals |

## API endpoints

All authenticated endpoints expect the `auth_token` HttpOnly cookie set by `/login`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/addUser` | Register |
| `POST` | `/login` | Log in (sets HttpOnly JWT cookie) |
| `POST` | `/logout` | Clear cookie |
| `GET`  | `/auth/me` | Current user info |
| `POST` | `/onboarding` | Validate goal + return weekly plan + materials. Yearly roadmap is generated in the background; poll `/longplan` until ready. |
| `GET`  | `/plan` | Latest weekly plan for the user |
| `POST` | `/plan/accept` | Mark draft plan as accepted |
| `POST` | `/plan/regenerate` | Replace draft with a freshly generated weekly plan from the same input |
| `POST` | `/plan/next` | Mark current week complete + generate next week (uses recent reviews + last quiz to steer) |
| `GET`  | `/longplan` | 12-month roadmap (404 while a fresh one is regenerating in background) |
| `POST` | `/longplan` | Manually regenerate the yearly plan |
| `POST` | `/reviews` | Submit per-task feedback (rating, helpful, difficulty, best part) |
| `GET`  | `/reviews` | List user's reviews |
| `POST` | `/week/summary` | Generate end-of-week summary + quiz |
| `GET`  | `/week/summary` | Latest summary |
| `POST` | `/week/summary/:id/quiz` | Grade quiz answers |
| `POST` | `/conversation` | Start an AI-tutor conversation |
| `POST` | `/conversation/:id` | Send a message |
| `GET`  | `/conversation/:id` | Read history |

## LLM module

Lives in [`BACKEND/src/llm/`](BACKEND/src/llm). Highlights:

- `provider.ts` — switches between `ChatAnthropic` and `ChatGroq` based on `LLM_PROVIDER`. Threads `maxTokens` through so long structured outputs (yearly plan, big quizzes) aren't truncated mid-JSON.
- `structured.ts` — wraps `withStructuredOutput` with one automatic retry on schema-mismatch, supports `method: "jsonMode"` to sidestep Groq's tool-call validator.
- `schemas.ts` — Zod sources of truth for `OnboardingInputSchema`, `PlanResponseSchema`.
- `learningPlan.ts` — system prompt + `generateWeeklyPlan()`. Rejection messages are pinned to English; plan content matches the user's input language.
- `longTermPlan.ts` — yearly roadmap; demands ≥20 tasks/month, scales difficulty across the year, restricts month-1 days to ≥ today.
- `weeklySummary.ts` — the recap + quiz generator and grader. Summary comes back as `summaryParagraphs: string[]` (flattened to markdown with `\n\n` joins) to dodge a Groq tool-call validator quirk where literal newline bytes inside a JSON string get rejected.
- `conversation.ts` — open AI tutor.

## Notes

- The yearly roadmap takes ~30s on Anthropic. `/onboarding` returns as soon as the weekly plan is ready (~15s) and fires the yearly LLM call in the background; the calendar page (`/learning`) polls `/longplan` every 4s and auto-renders when it lands.
- Regenerating the weekly plan (`/plan/next` or `/plan/regenerate`) wipes the user's existing yearly plan up front, so `/longplan` 404s during regeneration and the calendar shows a "Generating roadmap…" loader instead of stale data.
- Old plans saved before the URL-enrichment fix won't have task URLs filled — regenerate to get fresh real-source links.
- `.env` lives at the repo root (loaded by both `BACKEND` and the wipe script via dotenv).
- CORS is wired for `http://localhost:5173`; bump `CORS_ORIGIN` to deploy elsewhere.
