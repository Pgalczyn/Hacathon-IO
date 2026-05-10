import { z } from "zod";
import { invokeStructured } from "./structured.js";
import type { LLMConfig } from "./provider.js";

/* ==========================================================
 * Schemas
 * ========================================================== */

// Single flat schema (not a discriminated union — Groq's tool-call
// validator misrenders union schemas). Both branches keep all fields
// present; the LLM puts dummy values in the "not applicable" ones,
// and the normalizer below converts those into null for the public type.
export const QuizQuestionSchema = z.object({
  id: z.string().describe('Stable id like "q1", "q2", ...'),
  type: z.enum(["mcq", "open"]),
  question: z.string(),
  options: z
    .array(z.string())
    .describe(
      'For type="mcq": 3 or 4 short options. For type="open": empty array [].',
    ),
  correctOption: z
    .number()
    .int()
    .describe(
      'For type="mcq": 0-based index into `options` (0-3). For type="open": ALWAYS 0 (the field is ignored for open questions, but must be present).',
    ),
  rubric: z
    .string()
    .describe(
      'For type="open": 1-2 sentence rubric describing what a good answer covers. For type="mcq": MUST be the literal string "n/a".',
    ),
});

export const WeeklySummaryGenSchema = z.object({
  summaryParagraphs: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      "2-5 short standalone paragraphs/bullets. EACH ENTRY MUST BE A SINGLE LINE OF PLAIN TEXT — do NOT put any newline characters inside an entry. Together they cover what the user worked on, what went well, and what to focus on next. Total ~600-1200 chars. Match the user's input language.",
    ),
  quiz: z
    .array(QuizQuestionSchema)
    .min(3)
    .max(4)
    .describe(
      "EXACTLY 3-4 questions: 2 'mcq' + 1-2 'open'. Cover the most important concepts. Do NOT exceed 4.",
    ),
});

// Internal: raw shape the LLM returns (with sentinels: empty array,
// -1, empty string).
export type RawQuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type RawWeeklySummaryGen = z.infer<typeof WeeklySummaryGenSchema>;

// Public: shape callers consume — null for "not applicable" instead
// of sentinels. The wrapper does the conversion.
export interface QuizQuestion {
  id: string;
  type: "mcq" | "open";
  question: string;
  options: string[] | null;
  correctOption: number | null;
  rubric: string | null;
}

export interface WeeklySummaryGen {
  summaryMarkdown: string;
  quiz: QuizQuestion[];
}

function normalizeQuestion(raw: RawQuizQuestion): QuizQuestion {
  if (raw.type === "mcq") {
    return {
      id: raw.id,
      type: "mcq",
      question: raw.question,
      options: raw.options,
      correctOption: raw.correctOption,
      rubric: null, // for mcq the LLM was told to send "n/a" — drop it
    };
  }
  return {
    id: raw.id,
    type: "open",
    question: raw.question,
    options: null, // empty array from LLM — drop it
    correctOption: null, // dummy 0 from LLM — drop it
    rubric: raw.rubric,
  };
}

export const QuizGradingSchema = z.object({
  grades: z
    .array(
      z.object({
        questionId: z.string(),
        correct: z.boolean(),
        score: z
          .number()
          .min(0)
          .max(1)
          .describe("Per-question score 0..1. For mcq: 0 or 1. For open: partial OK."),
        feedback: z
          .string()
          .describe("1-2 sentences. Tone: encouraging, concrete, in user's language."),
      }),
    )
    .describe("One entry per quiz question, in the same order."),
});

export type QuizGrading = z.infer<typeof QuizGradingSchema>;

/* ==========================================================
 * Generation
 * ========================================================== */

const GENERATE_SYSTEM_PROMPT = `You are the end-of-week tutor of a self-learning app. The user finished a 7-day plan; your job is:

1. Write a short, warm summary as 'summaryParagraphs' — an ARRAY of
   2-5 short paragraphs/bullets covering what they worked on, what
   went well based on their ratings, and what to lean into next week.
   CRITICAL: each entry is a SINGLE LINE of plain text. NEVER put a
   newline character (\\n or a real line break) inside an entry — the
   JSON parser will reject it. If you want a paragraph break, end the
   current entry and start a new one in the array.
2. Build a quiz: 3-4 questions mixing multiple-choice and open-ended,
   probing the most important ideas from their plan. The mix MUST
   include at least 2 'mcq' and at least 1 'open' question.

Rules per question type:
- mcq: 'options' is a 3- or 4-element array. 'correctOption' is the
  0-based index of the right option. 'rubric' is null.
- open: 'options' is null, 'correctOption' is null, 'rubric' is a 1-2
  sentence description of what a good answer covers (used by the
  grader later). Open questions ask for explanation, comparison, or
  application — not single-word recall.

Style:
- Match the user's input language (the plan's topic_summary is the
  best signal).
- Concrete > abstract. Reference actual material titles when useful.
- Don't over-praise; calibrate tone to the rating signal.

Output: return a single valid JSON object matching the schema above.
No surrounding prose, no markdown fences.`;

export interface GenerateSummaryInput {
  topicSummary: string;
  weeklyFocus: string;
  tasks: { day: number; title: string; format: string; description: string }[];
  reviews: {
    materialTitle: string;
    materialType: string;
    rating: number;
    helpful: string;
    difficulty: string;
    bestPart: string | null;
  }[];
}

export interface GenerateSummaryOptions extends LLMConfig {}

export async function generateWeeklySummary(
  input: GenerateSummaryInput,
  options: GenerateSummaryOptions = {},
): Promise<WeeklySummaryGen> {
  const reviewLines =
    input.reviews.length === 0
      ? "(no reviews submitted this week)"
      : input.reviews
          .map(
            (r) =>
              `- "${r.materialTitle}" (${r.materialType}): ${r.rating}/5, helpful=${r.helpful}, difficulty=${r.difficulty}${r.bestPart ? `, best part: ${r.bestPart}` : ""}`,
          )
          .join("\n");

  const taskLines = input.tasks
    .map((t) => `Day ${t.day} [${t.format}] ${t.title} — ${t.description}`)
    .join("\n");

  const userPrompt = [
    `TOPIC: ${input.topicSummary}`,
    `WEEKLY FOCUS: ${input.weeklyFocus}`,
    ``,
    `TASKS COMPLETED THIS WEEK:`,
    taskLines,
    ``,
    `USER'S RATINGS OF MATERIALS:`,
    reviewLines,
  ].join("\n");

  const raw = await invokeStructured(userPrompt, WeeklySummaryGenSchema, {
    system: GENERATE_SYSTEM_PROMPT,
    temperature: options.temperature ?? 0.5,
    maxTokens: options.maxTokens ?? 4000,
    ...options,
  });

  return {
    // Llama emits literal newline bytes inside JSON strings, which violates
    // the JSON spec and Groq's tool-call validator rejects with a generic
    // "Failed to call a function" error. Asking for an array of single-line
    // paragraphs sidesteps the issue; we re-join them on this side.
    summaryMarkdown: raw.summaryParagraphs.join("\n\n"),
    quiz: raw.quiz.map(normalizeQuestion),
  };
}

/* ==========================================================
 * Grading
 * ========================================================== */

const GRADE_SYSTEM_PROMPT = `You are the grader for an end-of-week quiz. You receive a list of
questions, the user's answers, and (for open questions) a rubric.

Rules:
- For mcq: correct = (user's selectedIndex == correctOption). Score 0
  or 1. Feedback is 1 short sentence: if correct, brief affirmation;
  if wrong, name the right answer and 1 reason.
- For open: judge against the rubric. Partial credit OK (0.0 to 1.0).
  Be fair, not pedantic. Feedback names ONE concrete thing the answer
  did well or missed.
- Tone: encouraging, plain language, in the user's language. No fluff.

Output: an array 'grades' with one entry per question, IN THE SAME
ORDER as the questions provided.`;

export interface GradeAnswersInput {
  questions: QuizQuestion[];
  answers: { questionId: string; value: string | number }[];
}

export async function gradeQuizAnswers(
  input: GradeAnswersInput,
  options: GenerateSummaryOptions = {},
): Promise<QuizGrading> {
  const lines: string[] = [];
  for (const q of input.questions) {
    const a = input.answers.find((x) => x.questionId === q.id);
    const userAnswer = a ? String(a.value) : "(no answer)";
    if (q.type === "mcq") {
      const opts = (q.options ?? []).map((o, i) => `  [${i}] ${o}`).join("\n");
      lines.push(
        `Q: ${q.id} — MCQ\n${q.question}\n${opts}\nCORRECT INDEX: ${q.correctOption}\nUSER PICKED INDEX: ${userAnswer}\n`,
      );
    } else {
      lines.push(
        `Q: ${q.id} — OPEN\n${q.question}\nRUBRIC: ${q.rubric ?? "(none)"}\nUSER WROTE: ${userAnswer}\n`,
      );
    }
  }

  return invokeStructured(lines.join("\n"), QuizGradingSchema, {
    system: GRADE_SYSTEM_PROMPT,
    temperature: options.temperature ?? 0.2,
    // Per-question feedback for 3-6 questions can total ~1-2k tokens.
    maxTokens: options.maxTokens ?? 2500,
    ...options,
  });
}
