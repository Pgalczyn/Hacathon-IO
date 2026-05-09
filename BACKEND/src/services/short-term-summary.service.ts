import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    ShortTermSummaryResponseSchema,
    type ShortTermSummaryInput,
    type ShortTermSummaryResponse,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT = `You are a learning coach summarizing a user's weekly progress.
Analyze the completed and missed tasks and produce an honest, encouraging summary.

RULES:
- overall_score: compute based on completion rate, consistency, and time invested.
  100 = perfect week; 0 = nothing done. Be realistic, not inflated.
- completion_rate: simple fraction — completed tasks / total tasks.
- strengths: concrete observations (e.g. "Completed all video tasks", "Studied every day").
- improvements: actionable and kind (e.g. "Try shorter sessions on busy days").
- narrative_summary: 2-3 sentences, motivating, in the user's language (see 'language' field).
- next_week_focus: one specific, actionable suggestion.
- streak_comment: only if streakDays > 0; brief, motivational. Null otherwise.
- Language: ALL descriptive text must be in the language specified by the 'language' field.
  Resource titles stay in their original language.`;

export interface GenerateSummaryOptions extends LLMConfig {
    retryOnFailure?: boolean;
}

export async function generateShortTermSummary(
    input: ShortTermSummaryInput,
    options: GenerateSummaryOptions = {},
): Promise<ShortTermSummaryResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    const completedCount = input.tasks.filter((t) => t.completed).length;
    const totalCount = input.tasks.length;
    const totalMinutes = input.tasks.reduce(
        (sum, t) => sum + (t.minutesSpent ?? 0),
        0,
    );

    const taskLines = input.tasks
        .map(
            (t) =>
                `  Day ${t.day} | ${t.completed ? "✓" : "✗"} | ${t.format} | "${t.title}"` +
                (t.minutesSpent != null ? ` | ${t.minutesSpent}min` : ""),
        )
        .join("\n");

    const prompt = [
        `LEARNING GOAL: ${input.goalText}`,
        `WEEK NUMBER: ${input.weekNumber}`,
        `LANGUAGE: ${input.language}`,
        `TASKS (${completedCount}/${totalCount} completed, ${totalMinutes} total minutes):`,
        taskLines,
        input.streakDays != null
            ? `CURRENT STREAK: ${input.streakDays} days`
            : null,
    ]
        .filter(Boolean)
        .join("\n");

    return invokeStructured(prompt, ShortTermSummaryResponseSchema, {
        system: SYSTEM_PROMPT,
        temperature: 0.3,
        retryOnFailure,
        ...llmConfig,
    });
}
