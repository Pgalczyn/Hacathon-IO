import crypto from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";

// LLM services
import { generateLongTermGoalFromForm } from "../services/long-term-goal.service.js";
import {
    generateShortTermGoalFromForm,
    generateShortTermGoal
} from "../services/short-term-goal.service.js";
import { generateQuiz, gradeQuiz } from "../services/quiz.service.js";
import { generateShortTermSummary } from "../services/short-term-summary.service.js";

// Schemas
import {
    OnboardingFormInputSchema,
    QuizInputSchema,
    QuizResponseSchema,
    ShortTermGoalInputSchema,
    ShortTermSummaryInputSchema,
} from "../llm/learning-schemas.js";

// ── Schema for quiz submission ───────────────────
const QuizSubmissionSchema = z.object({
    quizResponse: QuizResponseSchema,
    userAnswers: z.array(z.number().int().min(0).max(3)),
});

// STEP 1 – ONBOARDING
export const onboardingController = {
    start: async (req: Request, res: Response): Promise<void> => {
        const parsed = OnboardingFormInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }

        const form = parsed.data;

        // 1. Long‑term roadmap – pass raw form directly
        let longTermResult;
        try {
            longTermResult = await generateLongTermGoalFromForm(form);
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

        // 2. Week‑1 short‑term plan – also raw form + first milestone
        const firstMilestone = longTermResult.roadmap.milestones[0];
        try {
            const shortTermResult = await generateShortTermGoalFromForm(form, {
                weekNumber: 1,
                currentMilestone: firstMilestone,
            });

            res.status(201).json({
                longTermGoal: longTermResult.roadmap,
                shortTermGoal: shortTermResult,
            });
        } catch (err) {
            res.status(207).json({
                longTermGoal: longTermResult.roadmap,
                shortTermGoal: null,
                error: "Week-1 plan generation failed",
                message: (err as Error).message,
            });
        }
    },
};

// STEP 2 – QUIZ
export const quizController = {
    // Generates a quiz manually from body payload
    generate: async (req: Request, res: Response): Promise<void> => {
        const parsed = QuizInputSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }
        try {
            const quiz = await generateQuiz(parsed.data);
            res.json(quiz);
        } catch (err) {
            res.status(500).json({ error: "LLM error", message: (err as Error).message });
        }
    },

    // Standard quiz grade without next week generation
    submit: async (req: Request, res: Response): Promise<void> => {
        const parsed = QuizSubmissionSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
            return;
        }

        const { quizResponse, userAnswers } = parsed.data;
        const sessionId = (req.body.sessionId as string) ?? crypto.randomUUID();

        const result = gradeQuiz(
            quizResponse,
            userAnswers,
            (req.body.userId as string) ?? "anonymous",
            (req.body.weekNumber as number) ?? 1,
            sessionId,
        );

        res.json(result);
    },
};

// STEP 3 – WEEKLY SUMMARY
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
};

// SHORT‑TERM GOAL (manual)
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
};