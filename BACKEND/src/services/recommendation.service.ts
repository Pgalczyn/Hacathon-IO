import { reviewService } from "./review.service.js";
import type { IReview } from "../models/review.js";

export interface FormatStat {
  format: string;
  avgRating: number;
  count: number;
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

  return lines.join("\n");
}

export class RecommendationService {
  async buildInsights(userId: string): Promise<LearnerInsights | null> {
    const reviews = await reviewService.listForUser(userId);
    if (reviews.length === 0) return null;
    return aggregate(reviews);
  }

  async buildPromptContext(userId: string): Promise<string | null> {
    const insights = await this.buildInsights(userId);
    if (!insights) return null;
    return insightsToPromptContext(insights);
  }
}

export const recommendationService = new RecommendationService();
