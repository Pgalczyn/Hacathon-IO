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
  daily_time_minutes: z.number().int().positive(),
  tasks: z.array(LearningTaskSchema).min(3).max(14),
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
  plan: PlanSchema.nullable(),
});

export type LearningTask = z.infer<typeof LearningTaskSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export const PreferredFormat = z.enum([
  "video",
  "article",
  "book",
  "course",
  "podcast",
  "community",
]);

export const OnboardingInputSchema = z.object({
  goalText: z.string().min(20),
  dailyMinutes: z.number().int().positive(),
  preferredFormats: z.array(PreferredFormat).min(1),
  wantsCommunity: z.boolean(),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;
