import { Router } from "express";
import { planController } from "../controllers/plan.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const planRouter = Router();

planRouter.get("/", requireAuth, planController.getLatest);
