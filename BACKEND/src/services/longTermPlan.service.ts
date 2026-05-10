import { LongTermPlan, type ILongTermPlan } from "../models/longTermPlan.js";
import { Plan, type IPlan } from "../models/plan.js";
import { generateLongTermPlan } from "../llm/index.js";

export interface GenerateLongTermArgs {
  userId: string;
  /** When omitted, the user's most recent weekly plan is used as the input source. */
  goalText?: string;
  currentLevel?: string;
  preferredFormats?: string[];
}

/** Day-only timestamp of "today" (no hours), used as the floor for plan
 *  generation: month 1's first day matches today's day-of-month. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export class LongTermPlanService {
  async generateForUser(args: GenerateLongTermArgs): Promise<ILongTermPlan> {
    const input = await this.resolveInput(args);
    const today = startOfToday();

    // Wipe old yearly plans for this user up front so /longplan returns
    // 404 during the ~30s LLM call. /learning's polling loader then
    // auto-swaps to the fresh calendar as soon as it's saved. Without
    // this the user gets stuck staring at the old plan since the page
    // fetches /longplan once on mount and the latest-by-createdAt is
    // still the old doc until the new one is written.
    await LongTermPlan.deleteMany({ userId: args.userId });

    const llm = await generateLongTermPlan(input, { today });

    const doc = new LongTermPlan({
      userId: args.userId,
      input,
      yearStartDate: today,
      topicSummary: llm.topicSummary,
      yearlyFocus: llm.yearlyFocus,
      months: llm.months,
    });
    return doc.save();
  }

  async getLatestForUser(userId: string): Promise<ILongTermPlan | null> {
    return LongTermPlan.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean<ILongTermPlan>();
  }

  /**
   * Build the (goalText, currentLevel, preferredFormats) bundle the LLM
   * needs. If the caller passed all three, use them; otherwise fall
   * back to the user's most recent weekly plan.
   */
  private async resolveInput(args: GenerateLongTermArgs) {
    if (args.goalText && args.currentLevel && args.preferredFormats) {
      return {
        goalText: args.goalText,
        currentLevel: args.currentLevel,
        preferredFormats: args.preferredFormats,
      };
    }
    const plan = await Plan.findOne({ userId: args.userId })
      .sort({ createdAt: -1 })
      .lean<IPlan>();
    if (!plan) {
      throw new Error(
        "No weekly plan found — generate one first or pass goalText / currentLevel / preferredFormats.",
      );
    }
    return {
      goalText: args.goalText ?? plan.input.goalText,
      currentLevel: args.currentLevel ?? plan.input.currentLevel,
      preferredFormats: args.preferredFormats ?? plan.input.preferredFormats,
    };
  }
}

export const longTermPlanService = new LongTermPlanService();
