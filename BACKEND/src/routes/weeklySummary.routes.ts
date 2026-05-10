import { Router } from "express";
import { weeklySummaryController } from "../controllers/weeklySummary.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const weeklySummaryRouter = Router();

weeklySummaryRouter.post("/", requireAuth, weeklySummaryController.generate);
weeklySummaryRouter.get("/", requireAuth, weeklySummaryController.getLatest);
weeklySummaryRouter.get("/:id", requireAuth, weeklySummaryController.getOne);
weeklySummaryRouter.post("/:id/quiz", requireAuth, weeklySummaryController.gradeQuiz);
