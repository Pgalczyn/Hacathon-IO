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
//
learningRouter.post("/quiz", quizController.generate);

// ── STEP 3: Weekly summary — narrative review (separate from quiz) ────────────
//
//   POST /learning/summary          — manual summary from body
//
learningRouter.post("/summary", summaryController.generate);

// ── Short-term goal (manual access / reset) ───────────────────────────────────
//
//   POST /learning/short-term-goal              — generate from body
//
learningRouter.post("/short-term-goal", shortTermGoalController.generate);
