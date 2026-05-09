import type { Request, Response } from "express";
import { randomUUID } from "crypto";

import { generateLongTermGoal } from "../services/long-term-goal.service.js";
import { generateShortTermGoal } from "../services/short-term-goal.service.js";
import { generateQuiz, gradeQuiz } from "../services/quiz.service.js";
import { generateShortTermSummary } from "../services/short-term-summary.service.js";

import {
    LongTermGoalInputSchema,
    ShortTermGoalInputSchema,
    QuizInputSchema,
    ShortTermSummaryInputSchema,
    type LongTermGoalInput,
} from "../llm/learning-schemas.js";

import {
    getUserById,
    getLatestLongTermGoal,
    getLatestShortTermGoal,
    getLatestWeeklyPlan,
    getLatestQuizResult,
    saveLongTermGoal,
    saveShortTermGoal,
    saveQuizResult,
} from "../services/mock-db.js";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — LONG-TERM GOAL
//
//   POST /learning/start
//   Body: LongTermGoalInput  (goalText, availableWeeks, currentLevel, dailyMinutes)
//
//   Generates the multi-week roadmap AND the first week's short-term plan in one
//   shot, then persists both so the user can jump straight into learning.
// ─────────────────────────────────────────────────────────────────────────────

export const onboardingController = {
    /**
     * Full onboarding flow:
     *   1. Generate long-term roadmap
     *   2. Immediately generate week-1 short-term plan
     *   3. Persist both
     *   4. Return both to the client
     */
    start: async (req: Request, res: Response): Promise<void> => {
        const parsed = LongTermGoalInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }

        const userId = (req.body.userId as string | undefined) ?? "anonymous";
        const goalInput: LongTermGoalInput = parsed.data;

        // 1. Long-term roadmap
        let longTermResult;
        try {
            longTermResult = await generateLongTermGoal(goalInput);
        } catch (err) {
            res.status(500).json({ error: "LLM error (long-term goal)", message: (err as Error).message });
            return;
        }

        if (!longTermResult.validation.accepted || !longTermResult.roadmap) {
            res.status(422).json({
                accepted: false,
                reason: longTermResult.validation.rejection_reason,
            });
            return;
        }

        await saveLongTermGoal({
            userId,
            input: goalInput,
            response: longTermResult,
            createdAt: new Date().toISOString(),
        });

        // 2. Week-1 short-term plan (based on first milestone)
        const firstMilestone = longTermResult.roadmap.milestones[0];
        const shortTermInput = {
            goalText: goalInput.goalText,
            weekNumber: 1,
            currentMilestone: firstMilestone,
            currentLevel: goalInput.currentLevel,
            dailyMinutes: goalInput.dailyMinutes,
        };

        let shortTermResult;
        try {
            shortTermResult = await generateShortTermGoal(shortTermInput);
        } catch (err) {
            // Long-term goal was saved; return it even if week-1 plan fails.
            res.status(207).json({
                longTermGoal: longTermResult.roadmap,
                shortTermGoal: null,
                error: "Week-1 plan generation failed",
                message: (err as Error).message,
            });
            return;
        }

        await saveShortTermGoal({
            userId,
            weekNumber: 1,
            input: shortTermInput,
            response: shortTermResult,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({
            longTermGoal: longTermResult.roadmap,
            shortTermGoal: shortTermResult,
        });
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — QUIZ  (end-of-week knowledge check)
//
//   POST /learning/quiz
//   Body: { topic, context, questionCount?, difficulty?, completedTasks? }
//
//   GET  /learning/quiz/:userId
//   Auto-derives topic & tasks from the user's latest weekly plan.
// ─────────────────────────────────────────────────────────────────────────────

export const quizController = {
    generate: async (req: Request, res: Response): Promise<void> => {
        const parsed = QuizInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }
        try {
            const result = await generateQuiz(parsed.data);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "LLM error", message: (err as Error).message });
        }
    },

    generateForUser: async (req: Request, res: Response): Promise<void> => {
        const { userId } = req.params as { userId: string };
        const plan = await getLatestWeeklyPlan(userId);
        if (!plan) {
            res.status(404).json({ error: "No weekly plan found for this user." });
            return;
        }

        const completedTasks = plan.tasks
            .filter((t) => t.completed)
            .map((t) => ({ title: t.title, format: t.format }));

        if (completedTasks.length === 0) {
            res.status(400).json({ error: "User has no completed tasks to quiz on yet." });
            return;
        }

        try {
            const result = await generateQuiz({
                topic: plan.goalText.slice(0, 80),
                context: plan.goalText,
                questionCount: 5,
                difficulty: "mixed",
                completedTasks,
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "LLM error", message: (err as Error).message });
        }
    },

    /**
     * POST /learning/quiz/:userId/submit
     * Body: { quizResponse, userAnswers: number[] }
     *
     * Grades the quiz, persists the QuizResult, and returns:
     *  - the graded result
     *  - the next week's short-term plan (already adapted to weak topics)
     */
    submitAndNext: async (req: Request, res: Response): Promise<void> => {
        const { userId } = req.params as { userId: string };

        const { quizResponse, userAnswers } = req.body as {
            quizResponse: Parameters<typeof gradeQuiz>[0];
            userAnswers: number[];
        };

        if (!quizResponse || !Array.isArray(userAnswers)) {
            res.status(400).json({ error: "quizResponse and userAnswers are required." });
            return;
        }

        // 1. Grade the quiz
        const plan = await getLatestWeeklyPlan(userId);
        const weekNumber = plan?.weekNumber ?? 1;
        const sessionId = randomUUID();

        const quizResult = gradeQuiz(
            quizResponse,
            userAnswers,
            userId,
            weekNumber,
            sessionId,
        );

        // 2. Persist quiz result to DB
        await saveQuizResult(quizResult);

        // 3. Load the user's long-term goal to find the next milestone
        const savedLtg = await getLatestLongTermGoal(userId);
        const goalInput = savedLtg?.input;
        const roadmap = savedLtg?.response?.roadmap;

        const nextWeekNumber = weekNumber + 1;
        const nextMilestone = roadmap?.milestones.find((m) => m.week === nextWeekNumber)
            ?? roadmap?.milestones.find((m) => m.week > weekNumber)
            ?? undefined;

        // 4. Generate next week's short-term plan, adapted to quiz performance
        let nextShortTermGoal = null;
        if (goalInput) {
            const shortTermInput = {
                goalText: goalInput.goalText,
                weekNumber: nextWeekNumber,
                currentMilestone: nextMilestone,
                currentLevel: goalInput.currentLevel,
                dailyMinutes: goalInput.dailyMinutes,
                quizPerformance: {
                    score: quizResult.score,
                    weakTopics: quizResult.weakTopics,
                    strongTopics: quizResult.strongTopics,
                },
            };

            try {
                nextShortTermGoal = await generateShortTermGoal(shortTermInput);

                await saveShortTermGoal({
                    userId,
                    weekNumber: nextWeekNumber,
                    input: shortTermInput,
                    response: nextShortTermGoal,
                    createdAt: new Date().toISOString(),
                });
            } catch (err) {
                // Non-fatal: return the quiz result even if next plan fails
                console.error("Failed to generate next short-term goal:", err);
            }
        }

        res.json({
            quizResult,
            nextWeekPlan: nextShortTermGoal,
        });
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — END-OF-WEEK SUMMARY  (narrative review, separate from quiz)
//
//   POST /learning/summary
//   GET  /learning/summary/:userId
// ─────────────────────────────────────────────────────────────────────────────

export const summaryController = {
    generate: async (req: Request, res: Response): Promise<void> => {
        const parsed = ShortTermSummaryInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }
        try {
            const result = await generateShortTermSummary(parsed.data);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "LLM error", message: (err as Error).message });
        }
    },

    generateForUser: async (req: Request, res: Response): Promise<void> => {
        const { userId } = req.params as { userId: string };

        const [user, plan] = await Promise.all([
            getUserById(userId),
            getLatestWeeklyPlan(userId),
        ]);

        if (!plan) {
            res.status(404).json({ error: "No weekly plan found for this user." });
            return;
        }

        const summaryInput = {
            goalText: plan.goalText,
            weekNumber: plan.weekNumber,
            tasks: plan.tasks,
            streakDays: user?.streakDays,
            language: user?.language ?? "pl",
        };

        try {
            const result = await generateShortTermSummary(summaryInput);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "LLM error", message: (err as Error).message });
        }
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL SHORT-TERM GOAL (re-generate without a quiz, e.g. week 1 reset)
//
//   POST /learning/short-term-goal
//   GET  /learning/short-term-goal/:userId   → current week's plan
// ─────────────────────────────────────────────────────────────────────────────

export const shortTermGoalController = {
    generate: async (req: Request, res: Response): Promise<void> => {
        const parsed = ShortTermGoalInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }
        try {
            const result = await generateShortTermGoal(parsed.data);
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: "LLM error", message: (err as Error).message });
        }
    },

    getForUser: async (req: Request, res: Response): Promise<void> => {
        const { userId } = req.params as { userId: string };
        const saved = await getLatestShortTermGoal(userId);
        if (!saved) {
            res.status(404).json({ error: "No short-term goal found. Start with POST /learning/start." });
            return;
        }
        res.json(saved.response);
    },
};
