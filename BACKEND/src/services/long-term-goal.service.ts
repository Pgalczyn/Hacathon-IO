import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    LongTermGoalResponseSchema,
    type LongTermGoalInput,
    type LongTermGoalResponse,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT = `You are a learning roadmap architect. Given a user's long-term learning goal,
produce a structured multi-week roadmap broken into clear milestones.

VALIDATION — reject (accepted=false, roadmap=null) if the goal is:
- Illegal, harmful, manipulative, or explicitly sexual.
- Too vague to plan against (e.g. "learn everything").
When rejecting, write one respectful sentence in the user's language.

ROADMAP GENERATION (only if accepted):
- Create milestones that progress logically: foundations → core skills → advanced application.
- Each milestone spans 1-2 weeks depending on complexity.
- Total weeks must fit the user's availableWeeks constraint.
- Tailor difficulty to the user's currentLevel.
- Respect dailyMinutes: don't plan more than they can realistically cover each day.
- Keep resource suggestions concrete (Title + Author/Channel). Set to null if unsure.
- Language: match the language of the goalText for all descriptive fields.
- Tone: direct, encouraging, no fluff.`;

export interface GenerateLongTermGoalOptions extends LLMConfig {
    retryOnFailure?: boolean;
}

export async function generateLongTermGoal(
    input: LongTermGoalInput,
    options: GenerateLongTermGoalOptions = {},
): Promise<LongTermGoalResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    const prompt = [
        `LEARNING GOAL: ${input.goalText}`,
        `CURRENT LEVEL: ${input.currentLevel}`,
        `AVAILABLE WEEKS: ${input.availableWeeks}`,
        `DAILY TIME BUDGET: ${input.dailyMinutes} minutes`,
    ].join("\n");

    return invokeStructured(prompt, LongTermGoalResponseSchema, {
        system: SYSTEM_PROMPT,
        temperature: 0.4,
        retryOnFailure,
        ...llmConfig,
    });
}