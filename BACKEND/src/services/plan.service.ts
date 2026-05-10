import type { Types } from "mongoose";
import { Plan, type IPlan, type PlanStatus } from "../models/plan.js";
import {
  OnboardingInputSchema,
  type OnboardingInput,
  type Plan as LlmPlan,
} from "../llm/index.js";
import type { MaterialBundle } from "./materials.service.js";

export interface PersistInput {
  userId: string;
  input: OnboardingInput;
  plan: LlmPlan;
  materials: MaterialBundle | null;
  /** Defaults to "draft" — caller must explicitly opt into anything else. */
  status?: PlanStatus;
}

export class PlanService {
  async save(data: PersistInput): Promise<IPlan> {
    const doc = new Plan({
      userId: data.userId,
      input: data.input,
      status: data.status ?? "draft",
      topicSummary: data.plan.topic_summary,
      weeklyFocus: data.plan.weekly_focus,
      dailyTimeMinutes: data.plan.daily_time_minutes,
      tasks: data.plan.tasks,
      materials: data.materials ?? { queries: {}, videos: [], books: [], academic_papers: [] },
    });
    return doc.save();
  }

  async getLatestForUser(userId: string | Types.ObjectId): Promise<IPlan | null> {
    return Plan.findOne({ userId }).sort({ createdAt: -1 }).lean<IPlan>();
  }

  /** Promote the user's most recent plan from draft to accepted. */
  async accept(userId: string): Promise<IPlan> {
    const plan = await Plan.findOne({ userId }).sort({ createdAt: -1 });
    if (!plan) throw new Error("No plan to accept");
    plan.status = "accepted";
    await plan.save();
    return plan;
  }

  /** Mark the user's currently accepted plan as completed (week is over). */
  async complete(userId: string): Promise<IPlan | null> {
    const plan = await Plan.findOne({ userId, status: "accepted" }).sort({ createdAt: -1 });
    if (!plan) return null;
    plan.status = "completed";
    await plan.save();
    return plan;
  }

  /** Delete every draft this user has — used before regenerating. */
  async deleteDrafts(userId: string): Promise<number> {
    const result = await Plan.deleteMany({ userId, status: "draft" });
    return result.deletedCount ?? 0;
  }

  /** Pull the input bundle from the user's most recent plan, for regenerating.
   *  The Mongo schema stores broader string types; we re-validate through
   *  the Zod onboarding schema so callers get a properly narrowed type
   *  (and any legacy bad data fails loudly here rather than at the LLM call). */
  async getLastInput(userId: string): Promise<OnboardingInput | null> {
    const plan = await Plan.findOne({ userId }).sort({ createdAt: -1 }).lean<IPlan>();
    if (!plan) return null;
    const parsed = OnboardingInputSchema.safeParse(plan.input);
    return parsed.success ? parsed.data : null;
  }
}

export const planService = new PlanService();
