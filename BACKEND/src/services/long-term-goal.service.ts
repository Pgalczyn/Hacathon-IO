import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    LongTermGoalResponseSchema,
    type LongTermGoalResponse,
    type OnboardingFormInput,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT_RAW = `You are a learning roadmap architect. The user has filled an onboarding form with raw fields.

VALIDATION – reject (accepted=false) if the goal is:
- Illegal, harmful, manipulative, or explicitly sexual.
- Too vague to plan against.

ROADMAP GENERATION (only if accepted):
- The user provided a time commitment string (e.g. "15-60 minutes"). Interpret it as the average daily time in minutes.
- The user provided learning methods (e.g. ["Videos/YouTube", "Online Courses"]). Map them to our internal task formats: video, article, book, course, podcast, community.
- Use that daily time and preferred formats when creating milestones and tasks.
- Milestones progress logically: foundations → core skills → application.
- Total weeks must be reasonable (default 8 if not specified).
- Difficulty should match the user's chosen level (beginner, intermediate, advanced).
- Language: match the user's goal text language.
- Tone: direct, encouraging.`;

export interface GenerateLongTermGoalFromFormOptions extends LLMConfig {
    retryOnFailure?: boolean;
}

export async function generateLongTermGoalFromForm(
    form: OnboardingFormInput,
    options: GenerateLongTermGoalFromFormOptions = {},
): Promise<LongTermGoalResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    const prompt = [
        `GOAL: ${form.goal}`,
        `LEVEL: ${form.level}`,
        `TIME COMMITMENT: ${form.timeSpent}`,
        `PREFERRED METHODS: ${form.methods.join(", ")}`,
        `WANTS COMMUNITY: ${form.connectWithOthers}`,
    ].join("\n");

    return invokeStructured(prompt, LongTermGoalResponseSchema, {
        system: SYSTEM_PROMPT_RAW,
        temperature: 0.4,
        retryOnFailure,
        ...llmConfig,
    });
}