import type { Types } from "mongoose";
import { Plan, type IPlan } from "../models/plan.js";
import type { OnboardingInput, Plan as LlmPlan } from "../llm/index.js";
import type { MaterialBundle } from "./materials.service.js";

export interface PersistInput {
  userId: string;
  input: OnboardingInput;
  plan: LlmPlan;
  materials: MaterialBundle | null;
}

export class PlanService {
  async save(data: PersistInput): Promise<IPlan> {
    const doc = new Plan({
      userId: data.userId,
      input: data.input,
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
}

export const planService = new PlanService();
