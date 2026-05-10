import { Types } from "mongoose";
import {
  WeeklySummary,
  QuizAttempt,
  type IWeeklySummary,
  type IQuizAttempt,
} from "../models/weeklySummary.js";
import { Plan, type IPlan } from "../models/plan.js";
import { reviewService } from "./review.service.js";
import {
  generateWeeklySummary,
  gradeQuizAnswers,
  type QuizQuestion,
} from "../llm/index.js";

export interface GenerateForUserArgs {
  userId: string;
  planId?: string;
}

export class WeeklySummaryService {
  async generateForUser(args: GenerateForUserArgs): Promise<IWeeklySummary> {
    const plan = await this.resolvePlan(args.userId, args.planId);
    if (!plan) {
      throw new Error("No plan found to summarize");
    }

    const planIdString = String(plan._id);
    const reviews = await reviewService.listForPlan(args.userId, planIdString);

    const llm = await generateWeeklySummary({
      topicSummary: plan.topicSummary,
      weeklyFocus: plan.weeklyFocus,
      tasks: plan.tasks.map((t) => ({
        day: t.day,
        title: t.title,
        format: t.format,
        description: t.description,
      })),
      reviews: reviews.map((r) => ({
        materialTitle: r.materialTitle,
        materialType: r.materialType,
        rating: r.rating,
        helpful: r.helpful,
        difficulty: r.difficulty,
        bestPart: r.bestPart,
      })),
    });

    const doc = new WeeklySummary({
      userId: args.userId,
      planId: plan._id,
      topicSummary: plan.topicSummary,
      weeklyFocus: plan.weeklyFocus,
      summaryMarkdown: llm.summaryMarkdown,
      quiz: llm.quiz,
    });
    return doc.save();
  }

  async getLatestForUser(userId: string): Promise<IWeeklySummary | null> {
    return WeeklySummary.findOne({ userId }).sort({ createdAt: -1 }).lean<IWeeklySummary>();
  }

  async getById(userId: string, summaryId: string): Promise<IWeeklySummary | null> {
    if (!Types.ObjectId.isValid(summaryId)) return null;
    return WeeklySummary.findOne({ userId, _id: summaryId }).lean<IWeeklySummary>();
  }

  async gradeAnswers(args: {
    userId: string;
    summaryId: string;
    answers: { questionId: string; value: string }[];
  }): Promise<IQuizAttempt> {
    const summary = await this.getById(args.userId, args.summaryId);
    if (!summary) throw new Error("Weekly summary not found");

    const questions = summary.quiz as unknown as QuizQuestion[];
    const grading = await gradeQuizAnswers({ questions, answers: args.answers });

    const grades = grading.grades;
    const totalScore =
      grades.length === 0
        ? 0
        : grades.reduce((sum, g) => sum + g.score, 0) / grades.length;

    const attempt = new QuizAttempt({
      userId: args.userId,
      weeklySummaryId: summary._id,
      answers: args.answers,
      grades,
      totalScore: Number(totalScore.toFixed(3)),
    });
    return attempt.save();
  }

  private async resolvePlan(userId: string, planId?: string): Promise<IPlan | null> {
    if (planId && Types.ObjectId.isValid(planId)) {
      return Plan.findOne({ _id: planId, userId }).lean<IPlan>();
    }
    return Plan.findOne({ userId }).sort({ createdAt: -1 }).lean<IPlan>();
  }
}

export const weeklySummaryService = new WeeklySummaryService();
