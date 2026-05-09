import { Router } from "express";
import {
    onboardingController,
    quizController,
    summaryController,
    shortTermGoalController,
} from "../controllers/learning.controller.js";

export const learningRouter = Router();

// ── STEP 1: Onboarding — generates long-term roadmap + week-1 plan ──────────
//
//   Body: { goalText, availableWeeks, currentLevel, dailyMinutes, userId? }
//   Returns: { longTermGoal, shortTermGoal }
//
learningRouter.post("/start", onboardingController.start);

// ── STEP 2: Quiz — end-of-week knowledge check ───────────────────────────────
//
//   POST /learning/quiz             — manual quiz from body
//   GET  /learning/quiz/:userId     — auto-derived quiz from latest weekly plan
//   POST /learning/quiz/:userId/submit
//     Body: { quizResponse, userAnswers: number[] }
//     Grades quiz → saves result → generates NEXT week's plan adapted to weaknesses
//     Returns: { quizResult, nextWeekPlan }
//
learningRouter.post("/quiz", quizController.generate);
learningRouter.get("/quiz/:userId", quizController.generateForUser);
learningRouter.post("/quiz/:userId/submit", quizController.submitAndNext);

// ── STEP 3: Weekly summary — narrative review (separate from quiz) ────────────
//
//   POST /learning/summary          — manual summary from body
//   GET  /learning/summary/:userId  — auto-derived from latest weekly plan
//
learningRouter.post("/summary", summaryController.generate);
learningRouter.get("/summary/:userId", summaryController.generateForUser);

// ── Short-term goal (manual access / reset) ───────────────────────────────────
//
//   POST /learning/short-term-goal              — generate from body
//   GET  /learning/short-term-goal/:userId      — fetch current week's plan
//
learningRouter.post("/short-term-goal", shortTermGoalController.generate);
learningRouter.get("/short-term-goal/:userId", shortTermGoalController.getForUser);
