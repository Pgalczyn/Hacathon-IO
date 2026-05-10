import {
  generateWeeklyPlan,
  type OnboardingInput,
  type PlanResponse,
} from "../llm/index.js";
import { materialsService, type MaterialBundle } from "./materials.service.js";
import { planService } from "./plan.service.js";
import { recommendationService } from "./recommendation.service.js";
import { longTermPlanService } from "./longTermPlan.service.js";

export interface OnboardingResponse {
  validation: PlanResponse["validation"];
  plan: PlanResponse["plan"];
  materials: MaterialBundle | null;
  /** Mongo `_id` of the persisted Plan, or null if anonymous / save failed. */
  planId: string | null;
  /** Mongo `_id` of the persisted yearly LongTermPlan, or null. */
  longTermPlanId: string | null;
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
    console.log("[onboarding] start, userId:", options.userId ?? "(anon)");
    let learnerContext: string | undefined;
    if (options.userId) {
      try {
        const ctx = await recommendationService.buildPromptContext(options.userId);
        learnerContext = ctx ?? undefined;
        console.log("[onboarding] insights built, length:", ctx?.length ?? 0);
      } catch (err) {
        console.warn("Failed to build learner insights:", err instanceof Error ? err.message : err);
      }
    }

    console.log("[onboarding] calling LLM...");
    const planResponse = await generateWeeklyPlan(
      input,
      learnerContext ? { learnerContext } : {},
    );
    console.log("[onboarding] LLM done, accepted:", planResponse.validation.accepted);

    if (!planResponse.validation.accepted || !planResponse.plan) {
      return {
        validation: planResponse.validation,
        plan: null,
        materials: null,
        planId: null,
        longTermPlanId: null,
      };
    }

    const topic = planResponse.plan.topic_summary ?? input.goalText;
    const materials = await materialsService.fetchByTopic(topic);

    let planId: string | null = null;
    let longTermPlanId: string | null = null;
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

      // Generate the yearly plan in the same request so the user lands on a
      // ready calendar. Best-effort: if the LLM call fails (rate limits, bad
      // JSON), we still return the weekly plan and let the user retry yearly.
      try {
        console.log("[onboarding] generating yearly plan...");
        const longPlan = await longTermPlanService.generateForUser({
          userId: options.userId,
          goalText: input.goalText,
          currentLevel: input.currentLevel,
          preferredFormats: input.preferredFormats,
        });
        longTermPlanId = String(longPlan._id);
        console.log("[onboarding] yearly plan saved:", longTermPlanId);
      } catch (err) {
        console.warn(
          "Failed to generate yearly plan:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    return {
      validation: planResponse.validation,
      plan: planResponse.plan,
      materials,
      planId,
      longTermPlanId,
    };
  }

  /** Replace the user's current draft (if any) with a fresh draft generated
   *  from the same input that was used last time. Use when a user wants a
   *  different take on the proposed week without retyping the form. */
  async regenerateForUser(userId: string): Promise<OnboardingResponse> {
    const input = await planService.getLastInput(userId);
    if (!input) {
      throw new Error("No previous plan to regenerate from — fill the onboarding form first.");
    }
    await planService.deleteDrafts(userId);
    return this.run(input, { userId });
  }

  /** Mark the user's current accepted plan as completed (week is over) and
   *  generate next week's draft from the same input. The recommendation
   *  service will fold in their latest reviews automatically. */
  async nextWeekForUser(userId: string): Promise<OnboardingResponse> {
    const input = await planService.getLastInput(userId);
    if (!input) {
      throw new Error("No previous plan — fill the onboarding form first.");
    }
    await planService.complete(userId); // no-op if nothing accepted; harmless
    return this.run(input, { userId });
  }
}

export const onboardingService = new OnboardingService();
