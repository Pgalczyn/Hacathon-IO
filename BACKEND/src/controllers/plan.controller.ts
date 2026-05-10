import type { Request, Response } from "express";
import { planService } from "../services/plan.service.js";
import { onboardingService } from "../services/onboarding.service.js";

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
  status?: string;
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
    // Legacy plans (saved before the status field existed) come back as
    // undefined — treat them as already-active so they don't surface the
    // accept gate to the user.
    status: doc.status ?? "accepted",
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

  accept = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const plan = await planService.accept(userId);
      res.json({ planId: String(plan._id), status: plan.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No plan") ? 404 : 500;
      res.status(status).json({ error: "Failed to accept plan", message });
    }
  };

  regenerate = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const result = await onboardingService.regenerateForUser(userId);
      const status = result.validation.accepted ? 201 : 422;
      res.status(status).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No previous") ? 404 : 500;
      res.status(status).json({ error: "Failed to regenerate plan", message });
    }
  };

  next = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const result = await onboardingService.nextWeekForUser(userId);
      const status = result.validation.accepted ? 201 : 422;
      res.status(status).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No previous") ? 404 : 500;
      res.status(status).json({ error: "Failed to start next week", message });
    }
  };
}

export const planController = new PlanController();
