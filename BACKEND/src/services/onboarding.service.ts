import {
  generateWeeklyPlan,
  type OnboardingInput,
  type PlanResponse,
} from "../llm/index.js";
import { materialsService, type MaterialBundle } from "./materials.service.js";
import { planService } from "./plan.service.js";
import { recommendationService } from "./recommendation.service.js";

export interface OnboardingResponse {
  validation: PlanResponse["validation"];
  plan: PlanResponse["plan"];
  materials: MaterialBundle | null;
  /** Mongo `_id` of the persisted Plan, or null if anonymous / save failed. */
  planId: string | null;
}

export interface RunOptions {
  /** When set, the generated plan is persisted under this user. */
  userId?: string;
}

export class OnboardingService {
  /**
   * Validates the user's goal via LLM, then (only if accepted) fetches real
   * learning materials from external APIs (YouTube / Gutendex / OpenAlex) and,
   * when a userId is supplied, persists the result.
   */
  async run(input: OnboardingInput, options: RunOptions = {}): Promise<OnboardingResponse> {
    let learnerContext: string | undefined;
    if (options.userId) {
      try {
        const ctx = await recommendationService.buildPromptContext(options.userId);
        learnerContext = ctx ?? undefined;
      } catch (err) {
        // Insights are best-effort: a Mongo hiccup shouldn't kill plan generation.
        console.warn("Failed to build learner insights:", err instanceof Error ? err.message : err);
      }
    }

    const planResponse = await generateWeeklyPlan(
      input,
      learnerContext ? { learnerContext } : {},
    );

    if (!planResponse.validation.accepted || !planResponse.plan) {
      return {
        validation: planResponse.validation,
        plan: null,
        materials: null,
        planId: null,
      };
    }

    const topic = planResponse.plan.topic_summary ?? input.goalText;
    const materials = await materialsService.fetchByTopic(topic);

    let planId: string | null = null;
    if (options.userId) {
      try {
        const saved = await planService.save({
          userId: options.userId,
          input,
          plan: planResponse.plan,
          materials,
        });
        planId = String(saved._id);
      } catch (err) {
        // Persistence is best-effort: if Mongo is down or save fails, still
        // return the plan to the client. The caller will see planId=null.
        console.warn("Failed to persist plan:", err instanceof Error ? err.message : err);
      }
    }

    return {
      validation: planResponse.validation,
      plan: planResponse.plan,
      materials,
      planId,
    };
  }
}

export const onboardingService = new OnboardingService();
