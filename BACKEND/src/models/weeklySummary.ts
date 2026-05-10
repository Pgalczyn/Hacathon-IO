import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IQuizQuestion {
  id: string;
  type: "mcq" | "open";
  question: string;
  options: string[] | null;
  correctOption: number | null;
  rubric: string | null;
}

export interface IWeeklySummary extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId | null;
  topicSummary: string;
  weeklyFocus: string;
  summaryMarkdown: string;
  quiz: IQuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["mcq", "open"], required: true },
    question: { type: String, required: true },
    options: { type: [String], default: null },
    correctOption: { type: Number, default: null },
    rubric: { type: String, default: null },
  },
  { _id: false },
);

const WeeklySummarySchema: Schema<IWeeklySummary> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", default: null, index: true },
    topicSummary: { type: String, required: true },
    weeklyFocus: { type: String, required: true },
    summaryMarkdown: { type: String, required: true },
    quiz: { type: [QuizQuestionSchema], required: true },
  },
  { timestamps: true },
);

export const WeeklySummary = mongoose.model<IWeeklySummary>(
  "WeeklySummary",
  WeeklySummarySchema,
);

/* ==================== Quiz Attempt ==================== */

export interface IQuizAttempt extends Document {
  userId: Types.ObjectId;
  weeklySummaryId: Types.ObjectId;
  answers: { questionId: string; value: string }[];
  grades: {
    questionId: string;
    correct: boolean;
    score: number;
    feedback: string;
  }[];
  totalScore: number; // 0..1
  createdAt: Date;
  updatedAt: Date;
}

const QuizAttemptSchema: Schema<IQuizAttempt> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weeklySummaryId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklySummary",
      required: true,
      index: true,
    },
    answers: [
      {
        _id: false,
        questionId: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    grades: [
      {
        _id: false,
        questionId: { type: String, required: true },
        correct: { type: Boolean, required: true },
        score: { type: Number, required: true, min: 0, max: 1 },
        feedback: { type: String, required: true },
      },
    ],
    totalScore: { type: Number, required: true, min: 0, max: 1 },
  },
  { timestamps: true },
);

export const QuizAttempt = mongoose.model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
