import { reviewService } from "./review.service.js";
import type { IReview } from "../models/review.js";
import { QuizAttempt, WeeklySummary } from "../models/weeklySummary.js";

export interface FormatStat {
  format: string;
  avgRating: number;
  count: number;
}

export interface QuizMissedTopic {
  question: string;
  feedback: string;
}

export interface LearnerInsights {
  totalReviews: number;
  avgRating: number;
  formatStats: FormatStat[];
  difficultyPattern: {
    too_easy: number;
    just_right: number;
    too_difficult: number;
  };
  topPositive: { title: string; type: string; rating: number }[];
  topNegative: { title: string; type: string; rating: number; helpful: string }[];
  /** From the most recent end-of-week quiz attempt, if any. */
  lastQuiz: {
    totalScore: number;
    missed: QuizMissedTopic[];
  } | null;
}

const HIGH_RATING = 5;
const LOW_RATING_THRESHOLD = 2;
const RECENT_LIMIT = 8; // pick from the most recent N reviews per side

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, x) => s + x, 0) / nums.length;
}

function aggregate(reviews: IReview[]): LearnerInsights {
  const byFormat = new Map<string, number[]>();
  let tooEasy = 0;
  let justRight = 0;
  let tooDifficult = 0;

  for (const r of reviews) {
    if (!byFormat.has(r.materialType)) byFormat.set(r.materialType, []);
    byFormat.get(r.materialType)!.push(r.rating);
    if (r.difficulty === "too_easy") tooEasy++;
    else if (r.difficulty === "just_right") justRight++;
    else if (r.difficulty === "too_difficult") tooDifficult++;
  }

  const formatStats: FormatStat[] = [...byFormat.entries()]
    .map(([format, ratings]) => ({
      format,
      avgRating: Number(average(ratings).toFixed(2)),
      count: ratings.length,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);

  // Most recent positive / negative — assumes reviews are passed sorted desc by createdAt.
  const topPositive = reviews
    .filter((r) => r.rating >= HIGH_RATING)
    .slice(0, RECENT_LIMIT)
    .map((r) => ({ title: r.materialTitle, type: r.materialType, rating: r.rating }));

  const topNegative = reviews
    .filter((r) => r.rating <= LOW_RATING_THRESHOLD || r.helpful === "waste_of_time")
    .slice(0, RECENT_LIMIT)
    .map((r) => ({
      title: r.materialTitle,
      type: r.materialType,
      rating: r.rating,
      helpful: r.helpful,
    }));

  return {
    totalReviews: reviews.length,
    avgRating: Number(average(reviews.map((r) => r.rating)).toFixed(2)),
    formatStats,
    difficultyPattern: { too_easy: tooEasy, just_right: justRight, too_difficult: tooDifficult },
    topPositive,
    topNegative,
    lastQuiz: null, // populated by buildInsights, which has DB access
  };
}

/**
 * Render insights as a compact, LLM-friendly text block. The plan generator
 * inserts this verbatim into the user prompt under a `LEARNER PROFILE` heading.
 */
export function insightsToPromptContext(i: LearnerInsights): string {
  const lines: string[] = [];
  lines.push(
    `- Total past reviews: ${i.totalReviews} (overall avg rating: ${i.avgRating}/5).`,
  );

  if (i.formatStats.length > 0) {
    const positives = i.formatStats.filter((s) => s.avgRating >= 4);
    const negatives = i.formatStats.filter((s) => s.avgRating < 3);
    if (positives.length > 0) {
      lines.push(
        `- Formats they like: ${positives
          .map((s) => `${s.format} (avg ${s.avgRating} from ${s.count})`)
          .join(", ")}.`,
      );
    }
    if (negatives.length > 0) {
      lines.push(
        `- Formats they DISLIKE — avoid or reduce: ${negatives
          .map((s) => `${s.format} (avg ${s.avgRating} from ${s.count})`)
          .join(", ")}.`,
      );
    }
  }

  const dp = i.difficultyPattern;
  const dpTotal = dp.too_easy + dp.just_right + dp.too_difficult;
  if (dpTotal > 0) {
    if (dp.too_difficult / dpTotal >= 0.3) {
      lines.push(
        `- Difficulty pattern: ${dp.too_difficult}/${dpTotal} marked "too difficult". Lean slightly easier this week.`,
      );
    } else if (dp.too_easy / dpTotal >= 0.4) {
      lines.push(
        `- Difficulty pattern: ${dp.too_easy}/${dpTotal} marked "too easy". Push the level up.`,
      );
    } else {
      lines.push(
        `- Difficulty pattern: ${dp.just_right}/${dpTotal} "just right" — keep current calibration.`,
      );
    }
  }

  if (i.topPositive.length > 0) {
    lines.push(
      `- Recently loved (rated 5/5): ${i.topPositive.map((p) => `"${p.title}" (${p.type})`).join("; ")}. Recommend more in this style.`,
    );
  }

  if (i.topNegative.length > 0) {
    lines.push(
      `- Recently disliked: ${i.topNegative.map((n) => `"${n.title}" (${n.type}, ${n.rating}/5${n.helpful === "waste_of_time" ? ", marked waste of time" : ""})`).join("; ")}. Avoid these and similar.`,
    );
  }

  if (i.lastQuiz) {
    const pct = Math.round(i.lastQuiz.totalScore * 100);
    lines.push(`- End-of-week quiz score: ${pct}%.`);
    if (i.lastQuiz.missed.length > 0) {
      const items = i.lastQuiz.missed
        .slice(0, 4)
        .map((m) => `"${m.question}" (gap: ${m.feedback})`)
        .join("; ");
      lines.push(
        `- Concepts they got wrong or partial — re-cover next week: ${items}.`,
      );
    } else if (pct >= 80) {
      lines.push(
        `- They aced the quiz — push the difficulty next week, don't re-teach the same material.`,
      );
    }
  }

  return lines.join("\n");
}

async function fetchLastQuiz(
  userId: string,
): Promise<LearnerInsights["lastQuiz"]> {
  const attempt = await QuizAttempt.findOne({ userId })
    .sort({ createdAt: -1 })
    .lean();
  if (!attempt) return null;

  const summary = await WeeklySummary.findById(attempt.weeklySummaryId).lean();
  const questionById = new Map(
    (summary?.quiz ?? []).map((q) => [q.id, q.question]),
  );

  // Treat anything below 0.7 as "missed" — open questions can be partial.
  const missed: QuizMissedTopic[] = attempt.grades
    .filter((g) => g.score < 0.7)
    .map((g) => ({
      question: questionById.get(g.questionId) ?? g.questionId,
      feedback: g.feedback,
    }));

  return { totalScore: attempt.totalScore, missed };
}

export class RecommendationService {
  async buildInsights(userId: string): Promise<LearnerInsights | null> {
    const reviews = await reviewService.listForUser(userId);
    const lastQuiz = await fetchLastQuiz(userId);
    if (reviews.length === 0 && !lastQuiz) return null;

    const base =
      reviews.length === 0
        ? {
            totalReviews: 0,
            avgRating: 0,
            formatStats: [],
            difficultyPattern: { too_easy: 0, just_right: 0, too_difficult: 0 },
            topPositive: [],
            topNegative: [],
            lastQuiz: null,
          }
        : aggregate(reviews);
    return { ...base, lastQuiz };
  }

  async buildPromptContext(userId: string): Promise<string | null> {
    const insights = await this.buildInsights(userId);
    if (!insights) return null;
    return insightsToPromptContext(insights);
  }
}

export const recommendationService = new RecommendationService();
