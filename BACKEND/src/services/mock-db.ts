/**
 * mock-db.ts
 * ──────────────────────────────────────────────
 * Temporary in-memory mock. Replace each function
 * with real Mongoose queries when the DB is ready.
 *
 * Shapes match the Zod schemas in learning-schemas.ts.
 */

import type {
    LongTermGoalInput,
    LongTermGoalResponse,
    ShortTermGoalInput,
    ShortTermGoalResponse,
    QuizResult,
    ShortTermSummaryInput,
} from "../llm/learning-schemas.js";

// ── Types ────────────────────────────────────────

export interface UserProfile {
    userId: string;
    name: string;
    language: "pl" | "en";
    streakDays: number;
}

export interface SavedLongTermGoal {
    userId: string;
    input: LongTermGoalInput;
    response: LongTermGoalResponse;
    createdAt: string;
}

export interface SavedShortTermGoal {
    userId: string;
    weekNumber: number;
    input: ShortTermGoalInput;
    response: ShortTermGoalResponse;
    createdAt: string;
}

export interface SavedWeeklyPlan {
    userId: string;
    weekNumber: number;
    goalText: string;
    tasks: ShortTermSummaryInput["tasks"];
    createdAt: string;
}

// ── In-memory stores ────────────────────────────

const MOCK_USERS: UserProfile[] = [
    { userId: "user_1", name: "Ania", language: "pl", streakDays: 5 },
    { userId: "user_2", name: "Tom",  language: "en", streakDays: 0 },
];

const LONG_TERM_GOALS: SavedLongTermGoal[] = [];

const SHORT_TERM_GOALS: SavedShortTermGoal[] = [];

const QUIZ_RESULTS: QuizResult[] = [];

const WEEKLY_PLANS: SavedWeeklyPlan[] = [
    {
        userId: "user_1",
        weekNumber: 1,
        goalText: "Chcę nauczyć się Pythona i zbudować aplikację webową we FastAPI.",
        tasks: [
            { day: 1, title: "Python in 100 Seconds — Fireship",     format: "video",   completed: true,  minutesSpent: 5  },
            { day: 1, title: "Official Python Tutorial — Intro",     format: "article", completed: true,  minutesSpent: 40 },
            { day: 2, title: "CS50P — Lecture 0 (Functions, Variables)", format: "video", completed: true, minutesSpent: 60 },
            { day: 3, title: "Automate the Boring Stuff — Ch. 1",    format: "book",    completed: false, minutesSpent: 0  },
            { day: 4, title: "100 Days of Code — Day 1 exercises",   format: "exercise",completed: true,  minutesSpent: 55 },
            { day: 5, title: "Real Python — Lists & Dicts tutorial", format: "article", completed: true,  minutesSpent: 45 },
            { day: 6, title: "CS50P — Lecture 1 (Conditionals)",     format: "video",   completed: false, minutesSpent: 0  },
            { day: 7, title: "Build a simple CLI calculator",        format: "exercise",completed: true,  minutesSpent: 50 },
        ],
        createdAt: "2025-01-06T08:00:00Z",
    },
];

// ── Reads ────────────────────────────────────────

export async function getUserById(userId: string): Promise<UserProfile | null> {
    return MOCK_USERS.find((u) => u.userId === userId) ?? null;
}

export async function getLatestLongTermGoal(
    userId: string,
): Promise<SavedLongTermGoal | null> {
    return (
        LONG_TERM_GOALS.filter((g) => g.userId === userId).at(-1) ?? null
    );
}

/** Convenience — returns just the LongTermGoalInput portion. */
export async function getLatestGoalInput(
    userId: string,
): Promise<LongTermGoalInput | null> {
    return (await getLatestLongTermGoal(userId))?.input ?? null;
}

export async function getLatestShortTermGoal(
    userId: string,
): Promise<SavedShortTermGoal | null> {
    return (
        SHORT_TERM_GOALS.filter((g) => g.userId === userId).at(-1) ?? null
    );
}

export async function getLatestWeeklyPlan(
    userId: string,
): Promise<SavedWeeklyPlan | null> {
    return WEEKLY_PLANS.filter((p) => p.userId === userId).at(-1) ?? null;
}

export async function getLatestQuizResult(
    userId: string,
): Promise<QuizResult | null> {
    return QUIZ_RESULTS.filter((r) => r.userId === userId).at(-1) ?? null;
}

export async function getQuizResultsForWeek(
    userId: string,
    weekNumber: number,
): Promise<QuizResult[]> {
    return QUIZ_RESULTS.filter(
        (r) => r.userId === userId && r.weekNumber === weekNumber,
    );
}

// ── Writes ───────────────────────────────────────
// Replace these with Mongoose .save() / .insertOne() calls when ready.

export async function saveLongTermGoal(record: SavedLongTermGoal): Promise<void> {
    LONG_TERM_GOALS.push(record);
}

export async function saveShortTermGoal(record: SavedShortTermGoal): Promise<void> {
    SHORT_TERM_GOALS.push(record);
}

export async function saveQuizResult(result: QuizResult): Promise<void> {
    QUIZ_RESULTS.push(result);
}

export async function saveWeeklyPlan(plan: SavedWeeklyPlan): Promise<void> {
    WEEKLY_PLANS.push(plan);
}

export async function updateUserStreak(userId: string, streakDays: number): Promise<void> {
    const user = MOCK_USERS.find((u) => u.userId === userId);
    if (user) user.streakDays = streakDays;
}
