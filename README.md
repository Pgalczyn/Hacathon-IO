# Hacathon-IO

A self-learning web app: tell it what you want to learn, and it builds you a personalized 7-day plan of videos, articles, books, courses and podcasts. After a week it summarizes what you learned, quizzes you, has an open conversation to verify understanding, and uses your per-task ratings to filter what kind of content to recommend next. It also matches you with other learners working on similar goals.

This is a hackathon project.

## How it works

1. **Sign up & onboarding.** You answer a short form: what you want to learn, how much time per day you have, your preferred formats, and whether you want to connect with other learners.
2. **Goal validation.** The LLM checks the goal makes sense as a learning topic and rejects illegal, harmful, manipulative, frivolous (stunts/pranks), or too-vague goals.
3. **Plan generation.** If the goal is accepted, the LLM produces a 7-day plan. Each task has a day, format, title, source/creator, an estimated duration, a description, and a reason it fits you.
4. **Per-task feedback.** After every material the user rates it (1–5), says whether it was helpful, and how the difficulty felt. This drives future recommendations.
5. **End of week.** A summary note, a multiple-choice + open-question quiz, and an open conversation that probes understanding.
6. **Community.** Optional matching with users on similar goals.

## Tech stack

**Backend** — Node.js · TypeScript (ESM) · Express 5 · Mongoose (MongoDB) · LangChain (Groq or Anthropic) · Zod · bcrypt
**Frontend** — React 19 · Vite

## Project layout

```
.
├── BACKEND/
│   ├── server.ts             # Express entrypoint
│   ├── dataBase.ts           # Mongo connection
│   ├── models/
│   │   └── userBasic.ts      # User schema (login/email/password/dateOfBirth)
│   └── src/
│       ├── llm/
│       │   ├── provider.ts       # Groq / Anthropic factory
│       │   ├── index.ts          # invokeLLM, streamLLM, re-exports
│       │   ├── structured.ts     # invokeStructured (Zod-validated JSON)
│       │   ├── schemas.ts        # PlanResponseSchema, OnboardingInputSchema
│       │   └── learningPlan.ts   # generateWeeklyPlan() + system prompt
│       ├── test-llm.ts        # smoke test for plain LLM call
│       ├── test-structured.ts # smoke test for structured output
│       └── test-plan.ts       # 7 sample goals: 3 should accept, 4 should reject
├── FRONTEND/                  # Vite + React (work in progress)
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js 20+
- MongoDB running locally on `mongodb://localhost:27017` (or any reachable Mongo URI)
- An API key for one LLM provider:
  - **Groq** (default, free tier available — https://console.groq.com), or
  - **Anthropic** (https://console.anthropic.com)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root
cat > .env <<'EOF'
# pick one provider; Groq is the default
GROQ_API_KEY=gsk_your_key_here
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...

# optional — falls back to localhost if unset
MONGO_URI=mongodb://localhost:27017/HacathonDB
EOF

# 3. Run the dev server
npm run dev
```

Server starts on **http://localhost:3000**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run server with `tsx watch` (auto-reload on changes) |
| `npm start` | Run server once with `tsx` |
| `npx tsx BACKEND/src/test-llm.ts` | Smoke-test the LLM connection (expects "pong") |
| `npx tsx BACKEND/src/test-structured.ts` | Smoke-test structured (Zod-validated) output |
| `npx tsx BACKEND/src/test-plan.ts` | Run the plan generator against 7 sample goals |
| `npx tsc --noEmit` | Type-check the project |

## LLM module

The LLM layer lives in [`BACKEND/src/llm/`](BACKEND/src/llm). Two ways to call it:

```ts
import { invokeLLM, generateWeeklyPlan } from "./BACKEND/src/llm/index.js";

// freeform text in, text out
const reply = await invokeLLM("Say pong.", { system: "You are terse." });

// structured plan generation
const result = await generateWeeklyPlan({
  goalText: "I want to learn Python and build a small web app.",
  dailyMinutes: 60,
  preferredFormats: ["video", "article", "course"],
  wantsCommunity: true,
});

if (!result.validation.accepted) {
  console.log("Rejected:", result.validation.rejection_category, result.validation.rejection_reason);
} else {
  console.log("Plan:", result.plan);
}
```

The plan response is fully type-safe (`PlanResponse` from [`BACKEND/src/llm/schemas.ts`](BACKEND/src/llm/schemas.ts)) and validated against a Zod schema, with one automatic retry on schema-mismatch.

### What gets rejected

The system prompt instructs the model to refuse goals that fall into any of these categories: `illegal`, `harmful`, `manipulative`, `frivolous`, `explicit`, `unclear`. Examples that are rejected:

- "Teach me to manufacture amphetamine"
- "Make me the world's fastest hot-dog eater this week"
- "How do I make my partner always do what I want"
- "Teach me everything"

Borderline goals (e.g. lockpicking as a hobby) are reframed and accepted.

## API endpoints

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/addUser` | implemented | Create a new user (login, email, password, dateOfBirth) |
| `POST` | `/onboarding` | planned | Validate goal + return a 7-day plan |
| `POST` | `/material/:id/rate` | planned | Per-task feedback (1–5, helpful, difficulty) |
| `POST` | `/week/summary` | planned | End-of-week note + quiz + open conversation |
| `GET`  | `/match` | planned | Find learners with similar goals |

## Roadmap

- [x] LLM provider abstraction (Groq / Anthropic)
- [x] Structured-output helper (Zod-validated JSON)
- [x] Goal validation + 7-day plan generator
- [ ] `/onboarding` endpoint
- [ ] Mongo models for plans, tasks, ratings
- [ ] Per-task feedback endpoint and recommendation filter
- [ ] Weekly quiz + open conversation flow
- [ ] User matching
- [ ] Frontend wired to the API

## Notes & known issues

- `BACKEND/server.ts` currently has a single `/addUser` endpoint with permissive error handling — it returns raw error objects (will be normalized) and uses `200` instead of `201` on creation.
- LLMs occasionally hallucinate URLs. The plan generator's system prompt instructs the model to default `url` to `null` and only fill it when highly confident; treat any returned URL as suggested-and-to-be-verified.
- CORS is not configured yet — the frontend will need it before it can call the backend from `localhost:5173`.
