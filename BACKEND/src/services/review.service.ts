import { z } from "zod";
import { Types } from "mongoose";
import {
  Review,
  type IReview,
  HELPFUL_VALUES,
  DIFFICULTY_VALUES,
  MATERIAL_TYPE_VALUES,
} from "../models/review.js";

export const ReviewInputSchema = z.object({
  planId: z.string().nullish(),
  materialKey: z.string().min(1),
  materialTitle: z.string().min(1),
  materialType: z.enum(MATERIAL_TYPE_VALUES),
  materialUrl: z.string().nullish(),
  rating: z.number().int().min(1).max(5),
  helpful: z.enum(HELPFUL_VALUES),
  difficulty: z.enum(DIFFICULTY_VALUES),
  bestPart: z.string().nullish(),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export interface CreateReviewArgs extends ReviewInput {
  userId: string;
}

export class ReviewService {
  async create(args: CreateReviewArgs): Promise<IReview> {
    const planId =
      args.planId && Types.ObjectId.isValid(args.planId)
        ? new Types.ObjectId(args.planId)
        : null;

    const doc = new Review({
      userId: args.userId,
      planId,
      materialKey: args.materialKey,
      materialTitle: args.materialTitle,
      materialType: args.materialType,
      materialUrl: args.materialUrl ?? null,
      rating: args.rating,
      helpful: args.helpful,
      difficulty: args.difficulty,
      bestPart: args.bestPart ?? null,
    });
    return doc.save();
  }

  async listForUser(userId: string): Promise<IReview[]> {
    return Review.find({ userId }).sort({ createdAt: -1 }).lean<IReview[]>();
  }

  async listForPlan(userId: string, planId: string): Promise<IReview[]> {
    if (!Types.ObjectId.isValid(planId)) return [];
    return Review.find({ userId, planId: new Types.ObjectId(planId) })
      .sort({ createdAt: -1 })
      .lean<IReview[]>();
  }
}

export const reviewService = new ReviewService();
