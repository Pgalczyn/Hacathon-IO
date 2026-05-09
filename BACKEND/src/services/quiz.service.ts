import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    QuizResponseSchema,
    type QuizInput,
    type QuizResponse,
    type QuizResult,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT = `You are a quiz generator for a self-learning app.
Generate a multiple-choice quiz that tests understanding of the material the user studied this week.

RULES:
- Base every question STRICTLY on the provided weekly plan / completed tasks context. Do not invent topics outside of this scope.
- Every question has EXACTLY 4 options (no more, no less).
- correct_index is 0-based (0 = first option, 3 = last).
- Vary difficulty according to the requested level. For "mixed", spread easy/medium/hard roughly 30/50/20.
- Explanations must be clear and educational — reinforce what the learner read/watched.
- Include the source task title in the explanation where helpful (e.g. "As covered in the video 'React Hooks Explained'...").
- topic_tag: a short lowercase tag (1-3 words) identifying the concept this question tests (e.g. 'state', 'props', 'lifecycle'). 
  This is used to detect weak areas for the next week's plan.
- Language: match the language of the provided context.
- Number questions starting from 1.`;

export interface GenerateQuizOptions extends LLMConfig {
    retryOnFailure?: boolean;
}

export async function generateQuiz(
    input: QuizInput,
    options: GenerateQuizOptions = {},
): Promise<QuizResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    let planContext = "";

    // 1. If full Short Term Goal is passed, use its rich context
    if (input.shortTermGoal) {
        planContext = [
            `WEEKLY FOCUS: ${input.shortTermGoal.weekly_focus}`,
            `TOPIC SUMMARY: ${input.shortTermGoal.topic_summary}`,
            `TASKS IN THE PLAN:`,
            ...input.shortTermGoal.tasks.map(
                (t, i) =>
                    `  ${i + 1}. [${t.format}] ${t.title}` +
                    `\n     Description: ${t.description}` +
                    `\n     Purpose: ${t.why_this}`
            ),
        ].join("\n");
    }
    // 2. Fallback to basic completedTasks list if Short Term Goal is missing
    else if (input.completedTasks && input.completedTasks.length > 0) {
        planContext = [
            `COMPLETED TASKS:`,
            ...input.completedTasks.map(
                (t, i) =>
                    `  ${i + 1}. [${t.format}] ${t.title}` +
                    (t.description ? ` — ${t.description}` : "")
            )
        ].join("\n");
    }

    const prompt = [
        `CONTEXT / GOAL: ${input.context ?? "Weekly Review"}`,
        `TOPIC: ${input.topic ?? input.shortTermGoal?.topic_summary ?? "General Topic"}`,
        `NUMBER OF QUESTIONS: ${input.questionCount}`,
        `DIFFICULTY: ${input.difficulty}`,
        ``,
        planContext
            ? `STUDY MATERIAL CONTEXT (Generate questions based ONLY on this):\n${planContext}`
            : "No specific study materials provided. Generate a general quiz based on the context.",
    ].join("\n");

    return invokeStructured(prompt, QuizResponseSchema, {
        system: SYSTEM_PROMPT,
        temperature: 0.5,
        retryOnFailure,
        ...llmConfig,
    });
}

/**
 * Grade a completed quiz and build a QuizResult ready to be persisted to the DB.
 */
export function gradeQuiz(
    quiz: QuizResponse,
    userAnswers: number[],
    userId: string,
    weekNumber: number,
    sessionId: string,
): QuizResult {
    const topicCorrect: Record<string, number> = {};
    const topicTotal: Record<string, number> = {};

    let correctCount = 0;

    quiz.questions.forEach((q, i) => {
        const tag = q.topic_tag;
        topicTotal[tag] = (topicTotal[tag] ?? 0) + 1;

        const isCorrect = userAnswers[i] === q.correct_index;
        if (isCorrect) {
            correctCount++;
            topicCorrect[tag] = (topicCorrect[tag] ?? 0) + 1;
        } else {
            topicCorrect[tag] = topicCorrect[tag] ?? 0;
        }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);

    const weakTopics = Object.entries(topicTotal)
        .filter(([tag, total]) => (topicCorrect[tag] ?? 0) / total < 0.5)
        .map(([tag]) => tag);

    const strongTopics = Object.entries(topicTotal)
        .filter(([tag, total]) => (topicCorrect[tag] ?? 0) / total === 1)
        .map(([tag]) => tag);

    return {
        sessionId,
        userId,
        weekNumber,
        score,
        totalQuestions: quiz.questions.length,
        correctCount,
        weakTopics,
        strongTopics,
        answeredAt: new Date().toISOString(),
    };
}