import { z } from "zod";

export const TaskFormat = z.enum([
  "video",
  "article",
  "book",
  "course",
  "podcast",
  "interview",
  "exercise",
]);

export const RejectionCategory = z.enum([
  "illegal",
  "harmful",
  "manipulative",
  "frivolous",
  "explicit",
  "unclear",
]);

export const LearningTaskSchema = z.object({
  day: z.number().int().min(1).max(7),
  format: TaskFormat,
  title: z.string().min(1),
  source: z
    .string()
    .nullable()
    .describe("Creator / channel / author / platform. Null if unknown."),
  url: z
    .string()
    .nullable()
    .describe(
      "Only set if you are highly confident the URL is canonical. Otherwise null. Never invent URLs.",
    ),
  estimated_time_minutes: z.number().int().positive(),
  description: z
    .string()
    .describe("What this material covers, 1-2 sentences."),
  why_this: z
    .string()
    .describe("Why this fits the user's goal and level, 1 sentence."),
});

export const PlanSchema = z.object({
  topic_summary: z
    .string()
    .describe("One-sentence summary of what the user wants to learn."),
  weekly_focus: z
    .string()
    .describe("What the user will achieve by end of this week."),
  // Allow 0 because the LLM returns a placeholder plan (with 0 here)
  // when the goal is rejected — strict positive() blew up parsing for
  // every "frivolous"/"illegal" rejection. The service zeroes the
  // whole plan to null on rejection anyway.
  daily_time_minutes: z.number().int().nonnegative(),
  tasks: z
    .array(LearningTaskSchema)
    .max(21)
    .describe(
      "When accepted: ideally 7-14 tasks covering all 7 days, each day with at least one task. When rejected: empty array []. Either way, this field must be an array (never null).",
    ),
});

export const PlanResponseSchema = z.object({
  validation: z.object({
    accepted: z.boolean(),
    rejection_reason: z
      .string()
      .nullable()
      .describe(
        "Short respectful explanation in the user's language. Null if accepted.",
      ),
    rejection_category: RejectionCategory.nullable(),
  }),
  // `plan` is always present in the LLM response (some tool-calling
  // backends like Groq misrender nullable/union schemas). When the
  // goal is rejected, the LLM still returns a placeholder plan and
  // the backend service zeros it out to null before responding.
  plan: PlanSchema,
});

export type LearningTask = z.infer<typeof LearningTaskSchema>;
export type Plan = z.infer<typeof PlanSchema>;

// Internal: shape returned by the LLM (plan is always present because
// Groq tool-calling chokes on nullable / union schemas).
export type LlmPlanResponse = z.infer<typeof PlanResponseSchema>;

// Public: what callers actually consume — plan is null when the goal was
// rejected. The LLM wrapper (generateWeeklyPlan) is responsible for
// translating LlmPlanResponse → PlanResponse by zeroing out plan when
// validation.accepted === false.
export type PlanResponse = {
  validation: LlmPlanResponse["validation"];
  plan: Plan | null;
};

export const PreferredFormat = z.enum([
  "video",
  "article",
  "book",
  "course",
  "podcast",
]);

export const ProficiencyLevel = z.enum([
  "complete_beginner",
  "beginner",
  "intermediate",
  "advanced",
]);

export type ProficiencyLevelValue = z.infer<typeof ProficiencyLevel>;

export const OnboardingInputSchema = z.object({
  goalText: z.string().min(20),
  dailyMinutes: z.number().int().positive(),
  preferredFormats: z.array(PreferredFormat).min(1),
  currentLevel: ProficiencyLevel,
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;
