import { z } from "zod";

// ─────────────────────────────────────────────
// 1. LONG-TERM GOAL  (multi-week roadmap)
// ─────────────────────────────────────────────

export const MilestoneSchema = z.object({
    week: z.number().int().min(1).describe("Which week this milestone targets."),
    title: z.string().min(1).describe("Short name of the milestone."),
    description: z
        .string()
        .describe("What the learner will be able to do by end of this milestone."),
    key_topics: z
        .array(z.string())
        .min(1)
        .max(6)
        .describe("Core concepts or skills covered."),
    suggested_resource: z
        .string()
        .nullable()
        .describe("One concrete resource title + author/channel. Null if unsure."),
});

export const LongTermGoalResponseSchema = z.object({
    validation: z.object({
        accepted: z.boolean(),
        rejection_reason: z.string().nullable(),
    }),
    roadmap: z
        .object({
            goal_summary: z
                .string()
                .describe("One-sentence restatement of the goal."),
            total_weeks: z.number().int().min(2).max(52),
            difficulty: z.enum(["beginner", "intermediate", "advanced"]),
            milestones: z.array(MilestoneSchema).min(2).max(20),
            final_outcome: z
                .string()
                .describe("What the learner will have achieved after all milestones."),
        })
        .nullable(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;
export type LongTermGoalResponse = z.infer<typeof LongTermGoalResponseSchema>;

export const LongTermGoalInputSchema = z.object({
    goalText: z.string().min(10),
    availableWeeks: z.number().int().min(1).max(52),
    currentLevel: z.enum(["beginner", "intermediate", "advanced"]),
    dailyMinutes: z.number().int().min(10).max(480),
});

export type LongTermGoalInput = z.infer<typeof LongTermGoalInputSchema>;

// ─────────────────────────────────────────────
// 2. SHORT-TERM GOAL  (weekly plan, 1 week)
// ─────────────────────────────────────────────

export const TaskFormat = z.enum([
    "video",
    "article",
    "book",
    "course",
    "podcast",
    "interview",
    "exercise",
]);

export const ShortTermTaskSchema = z.object({
    day: z.number().int().min(1).max(7),
    format: TaskFormat,
    title: z.string().min(1),
    source: z.string().nullable().describe("Creator / channel / author / platform. Null if unknown."),
    url: z.string().nullable().describe("Only set if highly confident. Never invent URLs."),
    estimated_time_minutes: z.number().int().positive(),
    description: z.string().describe("What this material covers, 1-2 sentences."),
    why_this: z.string().describe("Why this fits the user's goal and level, 1 sentence."),
});

export const ShortTermGoalResponseSchema = z.object({
    topic_summary: z.string().describe("One-sentence summary of what the user will focus on this week."),
    weekly_focus: z.string().describe("What the user will achieve by end of this week."),
    week_number: z.number().int().min(1),
    daily_time_minutes: z.number().int().positive(),
    tasks: z.array(ShortTermTaskSchema).min(3).max(14),
});

export type ShortTermTask = z.infer<typeof ShortTermTaskSchema>;
export type ShortTermGoalResponse = z.infer<typeof ShortTermGoalResponseSchema>;

export const ShortTermGoalInputSchema = z.object({
    goalText: z.string().min(10),
    weekNumber: z.number().int().min(1),
    currentMilestone: MilestoneSchema.optional().describe("The milestone this week aligns with."),
    currentLevel: z.enum(["beginner", "intermediate", "advanced"]),
    dailyMinutes: z.number().int().positive(),
    preferredFormats: z.array(TaskFormat).optional(),
    /** Previous quiz performance injected when regenerating after a quiz */
    quizPerformance: z
        .object({
            score: z.number().min(0).max(100).describe("Quiz score 0-100."),
            weakTopics: z.array(z.string()).describe("Topics the user struggled with."),
            strongTopics: z.array(z.string()).describe("Topics the user did well on."),
        })
        .optional()
        .describe("Filled only when regenerating the short-term goal after a quiz."),
});

export type ShortTermGoalInput = z.infer<typeof ShortTermGoalInputSchema>;

// ─────────────────────────────────────────────
// 3. QUIZ
// ─────────────────────────────────────────────

export const QuizQuestionSchema = z.object({
    id: z.number().int().min(1),
    question: z.string().min(1),
    options: z
        .array(z.string())
        .length(4)
        .describe("Always exactly 4 options, labelled implicitly A-D."),
    correct_index: z
        .number()
        .int()
        .min(0)
        .max(3)
        .describe("0-based index of the correct option."),
    explanation: z
        .string()
        .describe("Why the correct answer is right, 1-2 sentences."),
    difficulty: z.enum(["easy", "medium", "hard"]),
    topic_tag: z.string().describe("Short tag for the topic this question covers — used to detect weak areas."),
});

export const QuizResponseSchema = z.object({
    topic: z.string(),
    total_questions: z.number().int(),
    questions: z.array(QuizQuestionSchema).min(3).max(20),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizResponse = z.infer<typeof QuizResponseSchema>;

export const CompletedTaskForQuizSchema = z.object({
    title: z.string().describe("Title of the completed resource/task."),
    format: z.string().describe("e.g. video, article, book, exercise."),
    description: z.string().optional().describe("What the task covered (1-2 sentences)."),
});

export const QuizInputSchema = z.object({
    topic: z.string(),
    context: z.string(),
    questionCount: z.number(),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
    completedTasks: z.array(CompletedTaskForQuizSchema).optional(),
});

export type QuizInput = z.infer<typeof QuizInputSchema>;

/**
 * Saved result of a completed quiz session — stored in DB,
 * then fed into the next ShortTermGoalInput as `quizPerformance`.
 */
export const QuizResultSchema = z.object({
    sessionId: z.string(),
    userId: z.string(),
    weekNumber: z.number().int().min(1),
    score: z.number().min(0).max(100),
    totalQuestions: z.number().int(),
    correctCount: z.number().int(),
    weakTopics: z.array(z.string()),
    strongTopics: z.array(z.string()),
    answeredAt: z.string().datetime(),
});

export type QuizResult = z.infer<typeof QuizResultSchema>;

// ─────────────────────────────────────────────
// 4. SHORT-TERM SUMMARY  (end-of-week review)
// ─────────────────────────────────────────────

export const CompletedTaskSchema = z.object({
    title: z.string(),
    format: z.string(),
    day: z.number().int().min(1).max(7),
    completed: z.boolean(),
    minutesSpent: z.number().int().nonnegative().optional(),
});

export const ShortTermSummaryResponseSchema = z.object({
    overall_score: z
        .number()
        .min(0)
        .max(100)
        .describe("Progress score 0-100."),
    completion_rate: z
        .number()
        .min(0)
        .max(1)
        .describe("Fraction of tasks completed, 0.0 to 1.0."),
    strengths: z
        .array(z.string())
        .min(1)
        .max(4)
        .describe("What the learner did well this week."),
    improvements: z
        .array(z.string())
        .min(1)
        .max(4)
        .describe("Areas or habits to improve next week."),
    narrative_summary: z
        .string()
        .describe("Encouraging 2-3 sentence summary of the week in the user's language."),
    next_week_focus: z
        .string()
        .describe("One concrete recommendation for what to prioritize next week."),
    streak_comment: z
        .string()
        .nullable()
        .describe("Short motivational comment about the user's streak. Null if no streak data."),
});

export type ShortTermSummaryResponse = z.infer<typeof ShortTermSummaryResponseSchema>;

export const ShortTermSummaryInputSchema = z.object({
    goalText: z.string().min(10),
    weekNumber: z.number().int().min(1),
    tasks: z.array(CompletedTaskSchema).min(1),
    streakDays: z.number().int().nonnegative().optional(),
    language: z.string().default("pl").describe("BCP-47 language code, e.g. 'pl' or 'en'."),
});

export type ShortTermSummaryInput = z.infer<typeof ShortTermSummaryInputSchema>;

// ─────────────────────────────────────────────
// 5. ONBOARDING
// ─────────────────────────────────────────────

export const PreferredFormat = z.enum([
    "video",
    "article",
    "book",
    "course",
    "podcast",
    "community",
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
    wantsCommunity: z.boolean(),
    currentLevel: ProficiencyLevel,
    availableWeeks: z.number().int().min(1).max(52).default(8),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;
