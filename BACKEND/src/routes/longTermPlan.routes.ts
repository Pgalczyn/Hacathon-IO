import { Router } from "express";
import { longTermPlanController } from "../controllers/longTermPlan.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const longTermPlanRouter = Router();

longTermPlanRouter.post("/", requireAuth, longTermPlanController.generate);
longTermPlanRouter.get("/", requireAuth, longTermPlanController.getLatest);
