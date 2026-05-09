import { invokeStructured } from "../llm/structured.js";
import type { LLMConfig } from "../llm/provider.js";
import {
    QuizResponseSchema,
    type QuizInput,
    type QuizResponse,
    type QuizResult,
} from "../llm/learning-schemas.js";

const SYSTEM_PROMPT = `You are a quiz generator for a self-learning app.
The user has completed a set of learning tasks. Generate a multiple-choice quiz
that tests understanding of the material they actually studied.

RULES:
- Base every question strictly on the completed tasks provided. Do not invent topics
  the user has not studied.
- Every question has EXACTLY 4 options (no more, no less).
- correct_index is 0-based (0 = first option, 3 = last).
- Vary difficulty according to the requested level. For "mixed", spread easy/medium/hard roughly 30/50/20.
- Explanations must be clear and educational — reinforce what the learner read/watched.
- Do NOT repeat questions or rephrase the same concept twice.
- Include the source task title in the explanation where helpful (e.g. "As covered in CS50P Lecture 0...").
- topic_tag: a short lowercase tag (1-3 words) identifying the concept this question tests.
  This is used to detect weak areas for the next week's plan.
- Language: match the language of the goalText.
- Number questions starting from 1.`;

export interface GenerateQuizOptions extends LLMConfig {
    retryOnFailure?: boolean;
}

export async function generateQuiz(
    input: QuizInput,
    options: GenerateQuizOptions = {},
): Promise<QuizResponse> {
    const { retryOnFailure = true, ...llmConfig } = options;

    const taskLines = (input.completedTasks ?? [])
        .map(
            (t, i) =>
                `${i + 1}. [${t.format}] ${t.title}` +
                (t.description ? ` — ${t.description}` : ""),
        )
        .join("\n");

    const prompt = [
        `LEARNING GOAL: ${input.context}`,
        `TOPIC: ${input.topic}`,
        `NUMBER OF QUESTIONS: ${input.questionCount ?? 5}`,
        `DIFFICULTY: ${input.difficulty ?? "mixed"}`,
        ``,
        taskLines
            ? `COMPLETED TASKS (quiz must be based on these):\n${taskLines}`
            : `CONTEXT: ${input.context}`,
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
 * `userAnswers` is an array of 0-based indices corresponding to each question.
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

    // A topic is "weak" if the user got < 50 % of its questions right.
    const weakTopics = Object.entries(topicTotal)
        .filter(([tag, total]) => (topicCorrect[tag] ?? 0) / total < 0.5)
        .map(([tag]) => tag);

    // A topic is "strong" if the user got 100 % right.
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
