import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    ShortTermGoalResponseSchema,
    type ShortTermGoalInput,
    type ShortTermGoalResponse,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT = `You are a weekly learning planner. Given a learner's long-term goal and current milestone,
produce a concrete 7-day plan with specific, actionable tasks.

RULES:
- Respect the learner's daily time budget — do not assign more minutes per day than allowed.
- Prefer the learner's preferred formats when specified.
- If quizPerformance is provided, re-weight this week toward weak topics and reduce focus on strong ones.
  Explicitly address each weak topic with at least one task.
- Spread tasks realistically across the 7 days; not every day needs a task but gaps should be intentional.
- URLs: only set if you are highly confident the URL is canonical. Never invent URLs.
- Language: match the language of the goalText for all descriptive fields.
- Tone: motivating, specific, no filler.`;

export interface GenerateShortTermGoalOptions extends LLMConfig {
    retryOnFailure?: boolean;
}

export async function generateShortTermGoal(
    input: ShortTermGoalInput,
    options: GenerateShortTermGoalOptions = {},
): Promise<ShortTermGoalResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    const lines: string[] = [
        `LEARNING GOAL: ${input.goalText}`,
        `WEEK NUMBER: ${input.weekNumber}`,
        `CURRENT LEVEL: ${input.currentLevel}`,
        `DAILY TIME BUDGET: ${input.dailyMinutes} minutes`,
    ];

    if (input.currentMilestone) {
        lines.push(`CURRENT MILESTONE: ${input.currentMilestone.title} — ${input.currentMilestone.description}`);
        lines.push(`KEY TOPICS THIS WEEK: ${input.currentMilestone.key_topics.join(", ")}`);
    }

    if (input.preferredFormats?.length) {
        lines.push(`PREFERRED FORMATS: ${input.preferredFormats.join(", ")}`);
    }

    if (input.quizPerformance) {
        const { score, weakTopics, strongTopics } = input.quizPerformance;
        lines.push(``);
        lines.push(`PREVIOUS QUIZ PERFORMANCE (score: ${score}/100):`);
        if (weakTopics.length > 0) {
            lines.push(`  Weak topics (must address this week): ${weakTopics.join(", ")}`);
        }
        if (strongTopics.length > 0) {
            lines.push(`  Strong topics (can reduce focus): ${strongTopics.join(", ")}`);
        }
    }

    const prompt = lines.join("\n");

    return invokeStructured(prompt, ShortTermGoalResponseSchema, {
        system: SYSTEM_PROMPT,
        temperature: 0.4,
        retryOnFailure,
        ...llmConfig,
    });
}
