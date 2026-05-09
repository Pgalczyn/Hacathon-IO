import { Router } from "express";
import { reviewController } from "../controllers/review.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const reviewRouter = Router();

reviewRouter.post("/", requireAuth, reviewController.create);
reviewRouter.get("/", requireAuth, reviewController.list);
