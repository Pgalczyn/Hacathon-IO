import type { Request, Response } from "express";
import { planService } from "../services/plan.service.js";

/**
 * Reshape a stored Plan document into the same response shape as
 * /onboarding (so the frontend can use one renderer for both).
 */
function toOnboardingShape(doc: Record<string, unknown> & {
  topicSummary?: string;
  weeklyFocus?: string;
  dailyTimeMinutes?: number;
  tasks?: unknown[];
  materials?: unknown;
  _id: unknown;
}) {
  return {
    validation: { accepted: true, rejection_reason: null, rejection_category: null },
    plan: {
      topic_summary: doc.topicSummary,
      weekly_focus: doc.weeklyFocus,
      daily_time_minutes: doc.dailyTimeMinutes,
      tasks: doc.tasks,
    },
    materials: doc.materials,
    planId: String(doc._id),
  };
}

export class PlanController {
  getLatest = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const plan = await planService.getLatestForUser(userId);
      if (!plan) {
        res.status(404).json({ message: "No plan yet" });
        return;
      }
      res.json(toOnboardingShape(plan as unknown as Parameters<typeof toOnboardingShape>[0]));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to load plan", message });
    }
  };
}

export const planController = new PlanController();
