import { z } from "zod";

// Generic enums
export const TaskFormat = z.enum([
    "video",
    "article",
    "book",
    "course",
    "podcast",
    "interview",
    "exercise",
]);

// 1. LONG-TERM GOAL
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

// 2. SHORT-TERM GOAL (weekly plan)
export const ShortTermTaskSchema = z.object({
    day: z.number().int().min(1).max(7),
    format: TaskFormat,
    title: z.string().min(1),
    estimated_time_minutes: z.number().int().positive(),
    description: z.string().describe("What this material covers, 1-2 sentences."),
    why_this: z.string().describe("Why this fits the user's goal and level, 1 sentence."),
});

export const ShortTermGoalResponseSchema = z.object({
    topic_summary: z.string().describe("One-sentence summary of what the user will focus on this week."),
    weekly_focus: z.string().describe("What the user will achieve by end of this week."),
    week_number: z.number().int().min(1),
    daily_time_minutes: z.number().int().positive(),
    tasks: z.array(ShortTermTaskSchema).min(0).max(14),
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
    weeklyReflection: z
        .string()
        .optional()
        .describe(
            "Free-form reflection from the user about what they learned, completed, struggled with, or enjoyed this week."
        ),
    quizPerformance: z
        .object({
            score: z.number().min(0).max(100).describe("Quiz score 0-100."),
            weakTopics: z.array(z.string()).describe("Topics the user struggled with."),
            strongTopics: z.array(z.string()).describe("Topics the user did well on."),
        })
        .optional()
        .describe("Filled only when regenerating the short-term goal after a quiz."),
    longTermRoadmap: LongTermGoalResponseSchema.shape.roadmap.unwrap().optional()
        .describe("The user's complete long-term roadmap to understand the big picture."),
    previousPlans: z.array(ShortTermGoalResponseSchema).optional()
        .describe("History of previous short term goals to avoid repetition."),

});

export type ShortTermGoalInput = z.infer<typeof ShortTermGoalInputSchema>;

// 3. QUIZ
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
    topic: z.string().optional(),
    context: z.string().optional(),
    questionCount: z.number().default(5),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
    // Legacy support for basic tasks
    completedTasks: z.array(CompletedTaskForQuizSchema).optional(),
    // NEW: Pass the entire weekly plan
    shortTermGoal: ShortTermGoalResponseSchema.optional().describe("The full weekly plan structure generated previously."),
});

export type QuizInput = z.infer<typeof QuizInputSchema>;

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

// 4. SHORT-TERM SUMMARY
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

// 5. ONBOARDING (updated version, supersedes the old OnboardingInputSchema)
export const OnboardingFormInputSchema = z.object({
    goal: z.string().min(20),
    level: z.enum(["complete_beginner", "beginner", "intermediate", "advanced"]), // already valid from the form
    timeSpent: z.string().min(1),               // e.g. "15-60 minutes", "1-2 hours"
    methods: z.array(z.string()).min(1),        // e.g. ["Videos/YouTube", "Online Courses"]
    connectWithOthers: z.boolean(),
    userId: z.string().optional().default("anonymous"),
});

export type OnboardingFormInput = z.infer<typeof OnboardingFormInputSchema>;