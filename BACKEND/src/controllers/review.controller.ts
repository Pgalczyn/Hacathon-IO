import type { Request, Response } from "express";
import { reviewService, ReviewInputSchema } from "../services/review.service.js";

export class ReviewController {
  create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const parsed = ReviewInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review input", issues: parsed.error.issues });
      return;
    }

    try {
      const review = await reviewService.create({ ...parsed.data, userId });
      res.status(201).json(review);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to save review", message });
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const planId = typeof req.query.planId === "string" ? req.query.planId : null;
    try {
      const reviews = planId
        ? await reviewService.listForPlan(userId, planId)
        : await reviewService.listForUser(userId);
      res.json(reviews);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to load reviews", message });
    }
  };
}

export const reviewController = new ReviewController();
