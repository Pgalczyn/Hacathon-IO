import {
  generateWeeklyPlan,
  type OnboardingInput,
  type PlanResponse,
} from "../llm/index.js";
import { materialsService, type MaterialBundle } from "./materials.service.js";

export interface OnboardingResponse {
  validation: PlanResponse["validation"];
  plan: PlanResponse["plan"];
  materials: MaterialBundle | null;
}

export class OnboardingService {
  /**
   * Validates the user's goal via LLM, then (only if accepted) fetches real
   * learning materials from external APIs (YouTube / Gutendex / OpenAlex).
   * Returns both the structured 7-day plan and the bundle of real materials
   * — the frontend can use either.
   */
  async run(input: OnboardingInput): Promise<OnboardingResponse> {
    const planResponse = await generateWeeklyPlan(input);

    if (!planResponse.validation.accepted) {
      return {
        validation: planResponse.validation,
        plan: null,
        materials: null,
      };
    }

    const topic = planResponse.plan?.topic_summary ?? input.goalText;
    const materials = await materialsService.fetchByTopic(topic);

    return {
      validation: planResponse.validation,
      plan: planResponse.plan,
      materials,
    };
  }
}

export const onboardingService = new OnboardingService();
