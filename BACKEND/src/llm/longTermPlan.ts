import { z } from "zod";
import { invokeStructured } from "./structured.js";
import type { LLMConfig } from "./provider.js";

/* ==========================================================
 * Schemas
 * ========================================================== */

export const LongTermTaskSchema = z.object({
  day: z
    .number()
    .int()
    .min(1)
    .max(31)
    .describe(
      "Day of the calendar month, 1-31. Multiple tasks can share a day; not every day needs a task.",
    ),
  title: z
    .string()
    .min(1)
    .max(80)
    .describe(
      "Short topic / activity label (e.g. 'Python Basics', 'Web Dev Intro', 'Review week 1'). 1-5 words.",
    ),
});

export const MonthlyPlanSchema = z.object({
  monthIndex: z
    .number()
    .int()
    .min(1)
    .max(12)
    .describe("1 = first month of the plan, 12 = twelfth month."),
  theme: z
    .string()
    .min(1)
    .max(120)
    .describe(
      "One-sentence theme for this month, e.g. 'Foundations: setup, syntax, first programs'.",
    ),
  tasks: z
    .array(LongTermTaskSchema)
    .min(20)
    .max(28)
    .describe(
      "REQUIRED: 20-25 tasks per month — the user expects something to do almost every day. Leave only 4-6 deliberate rest days per month. Fewer than 20 tasks is REJECTED. Don't be lazy — produce concrete daily activity.",
    ),
});

export const LongTermPlanGenSchema = z.object({
  topicSummary: z
    .string()
    .describe("One-sentence summary of what the user is learning over the year."),
  yearlyFocus: z
    .string()
    .describe(
      "What the user will be capable of by month 12 (one sentence). Should be ambitious but realistic.",
    ),
  months: z
    .array(MonthlyPlanSchema)
    .min(12)
    .max(12)
    .describe(
      "Exactly 12 months. Difficulty and depth scale up across the year. Months 1-3 fundamentals, 4-6 building, 7-9 advanced topics, 10-12 capstone / mastery / projects.",
    ),
});

export type LongTermTask = z.infer<typeof LongTermTaskSchema>;
export type MonthlyPlan = z.infer<typeof MonthlyPlanSchema>;
export type LongTermPlanGen = z.infer<typeof LongTermPlanGenSchema>;

/* ==========================================================
 * Generation
 * ========================================================== */

const SYSTEM_PROMPT = `You are designing a 12-MONTH (yearly) learning roadmap for one user.

The roadmap is a CALENDAR-LIKE structure: 12 months, each with a theme
and 8-22 short topical tasks tied to specific days. The user views it
as a monthly calendar — each cell is a day and may carry one or more
short task labels (think syllabus items, not full lessons with URLs).

Style:
- Tasks are SHORT TITLES — 1-5 words. Examples: "Python Basics",
  "Web Dev Intro", "Data Structures", "Review", "Complementary Article",
  "Project: Todo App", "OOP Concepts".

Quantity (NON-NEGOTIABLE — the schema rejects anything below 20):
- Target: 20-25 tasks PER MONTH. Almost every day has something.
- Plan in 4-6 deliberate rest days per month — no more.
- ANYTHING UNDER 20 TASKS WILL BE REJECTED by the schema validator.
  Don't try to be minimal — the user has already committed to daily
  practice. Default to 22.
- Days mostly hold 1 task; pair 2 short tasks on a single day only
  if they complement each other (e.g., a video + its companion
  exercise).
- Spread evenly across the month — don't dump everything in week 1.
- For inspiration on how to fill 20+ days: include intro days, deep
  dives, paired practice/exercise, "review week N", project
  milestones, complementary articles, breakdown of subtopics.

Language:
- Match the user's input language for theme labels. Task titles can
  stay in English when the topic is technical (people Google English
  terms anyway).

Difficulty arc across the year:
- Months 1-3: foundations — setup, syntax, first principles.
- Months 4-6: building — common patterns, real-world examples,
  starter projects.
- Months 7-9: deepening — advanced topics, edge cases, original
  sources.
- Months 10-12: mastery / capstone — bigger projects, contributions,
  teaching others. By month 12 they should ship something substantial.

Calibrate to CURRENT_LEVEL:
- complete_beginner / beginner: spend MORE time on months 1-3 fundamentals.
- intermediate: skim fundamentals (months 1-2 are review), spend more
  on building and advanced.
- advanced: skip basics; use months 1-3 for advanced fundamentals
  (e.g. internals, theory, less-known techniques).

Each month has a one-sentence theme — concrete, action-oriented.

Output the year as 12 months in order (monthIndex 1..12). Don't skip
any month.`;

export interface LongTermInput {
  goalText: string;
  currentLevel: string;
  preferredFormats: string[];
}

export interface GenerateLongTermPlanOptions extends LLMConfig {}

export async function generateLongTermPlan(
  input: LongTermInput,
  options: GenerateLongTermPlanOptions = {},
): Promise<LongTermPlanGen> {
  const userPrompt = [
    `USER LEARNING GOAL:`,
    input.goalText,
    ``,
    `CURRENT_LEVEL: ${input.currentLevel}`,
    `PREFERRED FORMATS: ${input.preferredFormats.join(", ")}`,
  ].join("\n");

  return invokeStructured(userPrompt, LongTermPlanGenSchema, {
    system: SYSTEM_PROMPT,
    temperature: options.temperature ?? 0.5,
    ...options,
  });
}
