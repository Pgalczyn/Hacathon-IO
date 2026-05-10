import { z } from "zod";
import { invokeStructured } from "./structured.js";
import type { LLMConfig } from "./provider.js";

/* ==========================================================
 * Schemas
 * ========================================================== */

// Groq's tool-call validator chokes on `.nullable()` (same bug as in
// learningPlan), so each field is always present and we use sentinel
// values for the "not applicable" case. The wrapper below converts
// sentinels back to null in the public type.
export const QuizQuestionSchema = z.object({
  id: z.string().describe('Stable id like "q1", "q2", ...'),
  type: z.enum(["mcq", "open"]),
  question: z.string(),
  options: z
    .array(z.string())
    .describe(
      'For type="mcq": 3 or 4 options. For type="open": empty array [].',
    ),
  correctOption: z
    .number()
    .int()
    .describe(
      'For type="mcq": 0-based index into `options`. For type="open": -1.',
    ),
  rubric: z
    .string()
    .describe(
      'For type="open": 1-2 sentence rubric describing a good answer. For type="mcq": empty string "".',
    ),
});

export const WeeklySummaryGenSchema = z.object({
  summaryMarkdown: z
    .string()
    .describe(
      "A short markdown note (3-6 short paragraphs / bullets) summarizing what the user worked on this week, what went well, and what to focus on next. Match the user's input language.",
    ),
  quiz: z
    .array(QuizQuestionSchema)
    .min(3)
    .max(6)
    .describe(
      "3-6 questions mixing 'mcq' (≥2 of them) and 'open' (≥1). Cover the most important concepts from the plan and what the user actually engaged with.",
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
      rubric: null,
    };
  }
  return {
    id: raw.id,
    type: "open",
    question: raw.question,
    options: null,
    correctOption: null,
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

1. Write a short, warm summary (3-6 paragraphs / bullets) of what they
   worked on, what went well based on their ratings, and what to lean
   into next week.
2. Build a quiz: 3-6 questions mixing multiple-choice and open-ended,
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
- Don't over-praise; calibrate tone to the rating signal.`;

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
    ...options,
  });

  return {
    summaryMarkdown: raw.summaryMarkdown,
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
    ...options,
  });
}
