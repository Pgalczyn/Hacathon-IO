import mongoose, { Schema, type Document, type Types } from "mongoose";

export const HELPFUL_VALUES = [
  "yes_very_helpful",
  "somewhat",
  "not_very_useful",
  "waste_of_time",
] as const;

export const DIFFICULTY_VALUES = [
  "too_easy",
  "just_right",
  "too_difficult",
] as const;

export const MATERIAL_TYPE_VALUES = [
  "video",
  "article",
  "book",
  "course",
  "podcast",
  "interview",
  "exercise",
] as const;

export type HelpfulValue = (typeof HELPFUL_VALUES)[number];
export type DifficultyValue = (typeof DIFFICULTY_VALUES)[number];
export type MaterialTypeValue = (typeof MATERIAL_TYPE_VALUES)[number];

export interface IReview extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId | null;
  materialKey: string;
  materialTitle: string;
  materialType: MaterialTypeValue;
  materialUrl: string | null;
  rating: number;
  helpful: HelpfulValue;
  difficulty: DifficultyValue;
  bestPart: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", default: null, index: true },
    materialKey: { type: String, required: true },
    materialTitle: { type: String, required: true },
    materialType: { type: String, enum: MATERIAL_TYPE_VALUES, required: true },
    materialUrl: { type: String, default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    helpful: { type: String, enum: HELPFUL_VALUES, required: true },
    difficulty: { type: String, enum: DIFFICULTY_VALUES, required: true },
    bestPart: { type: String, default: null },
  },
  { timestamps: true },
);

ReviewSchema.index({ userId: 1, materialKey: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
