import { z } from "zod";
import { TavilySearchAPIWrapper } from "@langchain/tavily";
import { invokeStructured } from "./structured.js";
import type { LLMConfig } from "./provider.js";
import {
  PlanSchema,
  RejectionCategory,
  type OnboardingInput,
  type PlanResponse,
} from "./schemas.js";

const Step1Schema = z.object({
  validation: z.object({
    accepted: z.boolean(),
    rejection_reason: z.string().nullable(),
    rejection_category: RejectionCategory.nullable(),
  }),
  topic_summary: z
    .string()
    .nullable()
    .describe("One-sentence summary of the learning topic. Null if rejected."),
  search_queries: z
    .array(z.string())
    .nullable()
    .describe(
      "5-8 specific search queries to find real learning materials. Mix queries across formats (e.g. one for top YouTube videos, one for free courses, one for beginner articles, one for books, one for podcasts). Prefer English queries unless the goal is language-specific (e.g. learning Polish history). Null if rejected.",
    ),
});

type Step1Result = z.infer<typeof Step1Schema>;

const STEP1_SYSTEM = `You are the goal-validation and search-planning brain of a self-learning app.
You receive a user's learning goal and preferences. You produce a JSON object that:

1. VALIDATES the goal.
2. If valid, proposes a list of search queries that will find real,
   current learning materials.

==========================================================
VALIDATION
==========================================================
REJECT (set accepted=false, topic_summary=null, search_queries=null) if:
- illegal: drug manufacturing, weapons, hacking with malicious intent, fraud, etc.
- harmful: harm to self/others, dangerous activities without safety frame.
- manipulative: techniques to manipulate, coerce, gaslight, or harm others.
- frivolous: stunts, pranks, one-off feats, "TikTok-famous in a week".
- explicit: sexual content, especially involving minors.
- unclear: too vague to plan against, e.g. "learn everything".

When rejecting, write a SHORT respectful reason in the user's language
(one or two sentences, no lecturing).

ACCEPT goals that are real domains of skill, knowledge, or growth.

==========================================================
SEARCH QUERIES (only if accepted)
==========================================================
Produce 5-8 specific, well-formed search queries that will find real
learning materials. Cover the user's preferred formats. Examples:

- "best free Python course for beginners 2025"
- "FastAPI tutorial YouTube"
- "Atomic Habits book summary"
- "Spanish A2 podcast for learners"
- "machine learning math prerequisites article"

Avoid generic queries like "learn Python". Be specific about level,
format, and current materials. Prefer English queries (broader results),
unless the topic is inherently language-specific (e.g. "polska
literatura XX wieku").

Output language for topic_summary and rejection_reason: match the user's input language.`;

const STEP2_SYSTEM = `You are a learning plan designer. You will receive:
- A user's learning goal and preferences.
- A topic summary.
- A list of REAL search results found by web search.

Your job: build a 7-day learning plan using ONLY these search results.

HARD RULES:
- Every task must come from the search results provided.
- DO NOT invent titles, authors, or URLs that are not in the results.
- If a search result has a URL, use that exact URL.
- If you cannot find enough quality material in the results, return
  fewer tasks (minimum 3) rather than fabricating sources.
- Do not include the same resource twice across the week.
- Mix formats across the week.
- Daily total time fits the user's daily time budget.
- Progress from foundational to more challenging across the 7 days.

For each task, set:
- format: pick the best matching enum value based on the URL/source
  (e.g. youtube.com → video, coursera/udemy/edx → course, podcasts.apple.com
  or anchor.fm or spotify podcast → podcast, goodreads/amazon book pages
  → book, otherwise article).
- title: the actual title from the search result.
- source: the channel/author/platform (e.g. "freeCodeCamp", "Coursera",
  "Andrew Ng", "Lex Fridman").
- url: the exact URL from the search result. Required when available.
- description: 1-2 sentence summary based on the search result's content.
- why_this: 1 sentence explaining why this material fits the user's goal/level.

Output language for descriptions, why_this, weekly_focus: match user's input language.
Resource titles stay in their original language.`;

export interface GroundedPlanOptions extends LLMConfig {
  /** Max search results per query. */
  resultsPerQuery?: number;
  /** Tavily API key override. Falls back to process.env.TAVILY_API_KEY. */
  tavilyApiKey?: string;
}

interface SearchHit {
  query: string;
  results: { title: string; url: string; content?: string }[];
}

async function runSearches(
  queries: string[],
  options: GroundedPlanOptions,
): Promise<SearchHit[]> {
  const wrapper = new TavilySearchAPIWrapper({
    ...(options.tavilyApiKey ? { tavilyApiKey: options.tavilyApiKey } : {}),
  });
  const maxResults = options.resultsPerQuery ?? 5;

  const settled = await Promise.allSettled(
    queries.map((q) =>
      wrapper.rawResults({ query: q, max_results: maxResults }),
    ),
  );

  return settled.map((s, i) => {
    const query = queries[i] ?? "";
    if (s.status !== "fulfilled") return { query, results: [] };
    return {
      query,
      results: s.value.results.map((r) => ({
        title: r.title,
        url: r.url,
        ...(r.content !== undefined ? { content: r.content } : {}),
      })),
    };
  });
}

function formatResultsForPrompt(hits: SearchHit[]): string {
  const blocks = hits.map((hit) => {
    if (hit.results.length === 0) {
      return `### Query: ${hit.query}\n(no results)`;
    }
    const lines = hit.results.map(
      (r) =>
        `- title: ${r.title}\n  url: ${r.url}\n  excerpt: ${(r.content ?? "").slice(0, 240).replace(/\s+/g, " ").trim()}`,
    );
    return `### Query: ${hit.query}\n${lines.join("\n")}`;
  });
  return blocks.join("\n\n");
}

export async function generateWeeklyPlanGrounded(
  input: OnboardingInput,
  options: GroundedPlanOptions = {},
): Promise<PlanResponse> {
  const step1Prompt = [
    `USER LEARNING GOAL:`,
    input.goalText,
    ``,
    `DAILY TIME BUDGET: ${input.dailyMinutes} minutes`,
    `PREFERRED FORMATS: ${input.preferredFormats.join(", ")}`,
    `WANTS TO CONNECT WITH OTHERS: ${input.wantsCommunity ? "yes" : "no"}`,
  ].join("\n");

  const step1: Step1Result = await invokeStructured(step1Prompt, Step1Schema, {
    system: STEP1_SYSTEM,
    temperature: options.temperature ?? 0.2,
    ...options,
  });

  if (!step1.validation.accepted || !step1.search_queries) {
    return {
      validation: step1.validation,
      plan: null,
    };
  }

  const hits = await runSearches(step1.search_queries, options);
  const totalResults = hits.reduce((sum, h) => sum + h.results.length, 0);

  if (totalResults === 0) {
    return {
      validation: {
        accepted: false,
        rejection_reason:
          "Nie udało się znaleźć materiałów do tego celu. Spróbuj sformułować go inaczej lub bardziej konkretnie.",
        rejection_category: "unclear",
      },
      plan: null,
    };
  }

  const step2Prompt = [
    `USER LEARNING GOAL:`,
    input.goalText,
    ``,
    `TOPIC SUMMARY: ${step1.topic_summary ?? input.goalText}`,
    `DAILY TIME BUDGET: ${input.dailyMinutes} minutes`,
    `PREFERRED FORMATS: ${input.preferredFormats.join(", ")}`,
    ``,
    `SEARCH RESULTS:`,
    formatResultsForPrompt(hits),
  ].join("\n");

  const plan = await invokeStructured(step2Prompt, PlanSchema, {
    system: STEP2_SYSTEM,
    temperature: options.temperature ?? 0.3,
    ...options,
  });

  return {
    validation: step1.validation,
    plan,
  };
}
