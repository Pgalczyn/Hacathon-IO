import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    ShortTermGoalResponseSchema,
    type ShortTermGoalResponse,
    type OnboardingFormInput,
    type Milestone,
    type ShortTermGoalInput,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT_SHORT_RAW = `You are an expert weekly learning planner orchestrating an iterative learning journey.

RULES:
- Interpret time commitment string as average daily minutes.
- DO NOT repeat specific tasks, titles, or exact sub-topics from previous weeks. The user has already completed them.
- If a long-term roadmap is provided, ensure this week's focus logically advances the user toward the final outcome.
- The current milestone is provided; tasks must align with it.
- If quiz performance is provided, dedicate the first 1-2 days to reviewing "weak topics" before advancing to new material.
- URLs: NEVER include any URLs or links. The plan should describe **what to learn**, not where to find it.
- Spread tasks realistically across 7 days.
- Language: match the goal text.
- Tone: motivating, specific.`;

export interface GenerateShortTermGoalFromFormOptions extends LLMConfig {
    weekNumber?: number | undefined;
    currentMilestone?: Milestone | undefined;
    retryOnFailure?: boolean | undefined;
}

// 1. Used during STEP 1 (Onboarding - Week 1)
export async function generateShortTermGoalFromForm(
    form: OnboardingFormInput,
    context: {
        weekNumber?: number | undefined;
        currentMilestone?: Milestone | undefined;
    },
    options: GenerateShortTermGoalFromFormOptions = {},
): Promise<ShortTermGoalResponse> {
    const { weekNumber = 1, currentMilestone } = context;
    const { retryOnFailure = true, ...llmConfig } = options;

    const lines: string[] = [
        `GOAL: ${form.goal}`,
        `WEEK NUMBER: ${weekNumber}`,
        `LEVEL: ${form.level}`,
        `TIME COMMITMENT: ${form.timeSpent}`,
        `PREFERRED METHODS: ${form.methods.join(", ")}`,
    ];

    if (currentMilestone) {
        lines.push(`CURRENT MILESTONE: ${currentMilestone.title} — ${currentMilestone.description}`);
        lines.push(`KEY TOPICS: ${currentMilestone.key_topics.join(", ")}`);
    }

    return invokeStructured(lines.join("\n"), ShortTermGoalResponseSchema, {
        system: SYSTEM_PROMPT_SHORT_RAW,
        temperature: 0.4,
        retryOnFailure,
        ...llmConfig,
    });
}

export interface GenerateShortTermGoalOptions extends LLMConfig {
    retryOnFailure?: boolean | undefined;
}

// 2. Used for ongoing weeks (Week 2+) taking Iterative History into account
export async function generateShortTermGoal(
    input: ShortTermGoalInput,
    options: GenerateShortTermGoalOptions = {}
): Promise<ShortTermGoalResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    const lines: string[] = [
        `OVERALL GOAL: ${input.goalText}`,
        `GENERATING PLAN FOR WEEK NUMBER: ${input.weekNumber}`,
        `LEVEL: ${input.currentLevel}`,
        `DAILY MINUTES: ${input.dailyMinutes}`,
    ];

    if (input.preferredFormats && input.preferredFormats.length > 0) {
        lines.push(`PREFERRED METHODS: ${input.preferredFormats.join(", ")}`);
    }

    // Include Big Picture (Roadmap)
    if (input.longTermRoadmap) {
        lines.push(`\n--- LONG-TERM ROADMAP ---`);
        lines.push(`FINAL OUTCOME: ${input.longTermRoadmap.final_outcome}`);
        const milestones = input.longTermRoadmap.milestones.map(m => `Week ${m.week}: ${m.title}`).join(" -> ");
        lines.push(`MILESTONES PIPELINE: ${milestones}`);
    }

    // Include Current Milestone context
    if (input.currentMilestone) {
        lines.push(`\n--- CURRENT MILESTONE FOCUS ---`);
        lines.push(`${input.currentMilestone.title} — ${input.currentMilestone.description}`);
        lines.push(`KEY TOPICS TO COVER: ${input.currentMilestone.key_topics.join(", ")}`);
    }

    // Include Previous Weeks (History) to avoid repetition
    if (input.previousPlans && input.previousPlans.length > 0) {
        lines.push(`\n--- PREVIOUS WEEKS' HISTORY (DO NOT REPEAT THESE) ---`);
        input.previousPlans.forEach(plan => {
            lines.push(`Week ${plan.week_number} Focus: ${plan.weekly_focus}`);
            const taskNames = plan.tasks.map(t => t.title).join(", ");
            lines.push(`  Tasks already completed: ${taskNames}`);
        });
    }

    if (input.weeklyReflection) {
        lines.push(`\n--- USER WEEKLY REFLECTION ---`);
        lines.push(input.weeklyReflection);
    }

    // Include Quiz Performance to fix weaknesses
    if (input.quizPerformance) {
        lines.push(`\n--- LAST WEEK'S QUIZ RESULTS ---`);
        lines.push(`SCORE: ${input.quizPerformance.score}/100`);
        if (input.quizPerformance.weakTopics.length > 0) {
            lines.push(`CRITICAL WEAKNESSES (Must assign review tasks for these): ${input.quizPerformance.weakTopics.join(", ")}`);
        }
        if (input.quizPerformance.strongTopics.length > 0) {
            lines.push(`MASTERED TOPICS (Move on from these): ${input.quizPerformance.strongTopics.join(", ")}`);
        }
    }

    return invokeStructured(lines.join("\n"), ShortTermGoalResponseSchema, {
        system: SYSTEM_PROMPT_SHORT_RAW,
        temperature: 0.4,
        retryOnFailure,
        ...llmConfig,
    });
}