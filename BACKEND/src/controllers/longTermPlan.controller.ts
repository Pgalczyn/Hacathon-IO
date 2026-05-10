import type { Request, Response } from "express";
import { z } from "zod";
import { longTermPlanService } from "../services/longTermPlan.service.js";

const GenerateBodySchema = z
  .object({
    goalText: z.string().min(20).optional(),
    currentLevel: z
      .enum(["complete_beginner", "beginner", "intermediate", "advanced"])
      .optional(),
    preferredFormats: z.array(z.string()).optional(),
  })
  .partial();

export class LongTermPlanController {
  generate = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const parsed = GenerateBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    try {
      const args: Parameters<typeof longTermPlanService.generateForUser>[0] = { userId };
      if (parsed.data.goalText !== undefined) args.goalText = parsed.data.goalText;
      if (parsed.data.currentLevel !== undefined) args.currentLevel = parsed.data.currentLevel;
      if (parsed.data.preferredFormats !== undefined) args.preferredFormats = parsed.data.preferredFormats;
      const plan = await longTermPlanService.generateForUser(args);
      res.status(201).json(plan);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No weekly plan") ? 404 : 500;
      res.status(status).json({ error: "Failed to generate long-term plan", message });
    }
  };

  getLatest = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const plan = await longTermPlanService.getLatestForUser(userId);
      if (!plan) {
        res.status(404).json({ message: "No long-term plan yet" });
        return;
      }
      res.json(plan);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to load long-term plan", message });
    }
  };
}

export const longTermPlanController = new LongTermPlanController();
