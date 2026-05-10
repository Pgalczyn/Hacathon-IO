import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ITaskDoc {
  day: number;
  format: string;
  title: string;
  source: string | null;
  url: string | null;
  estimated_time_minutes: number;
  description: string;
  why_this: string;
}

export interface IVideoMaterial {
  videoId: string;
  title: string;
  thumbnail: string;
  embedUrl: string;
}

export interface IBookMaterial {
  title: string;
  author: string;
  readUrl: string | null;
}

export interface IPaperMaterial {
  title: string;
  author: string;
  year: number | null;
  pdfUrl: string | null;
}

export type PlanStatus = "draft" | "accepted" | "completed";

export interface IPlan extends Document {
  userId: Types.ObjectId;
  input: {
    goalText: string;
    currentLevel: string;
    dailyMinutes: number;
    preferredFormats: string[];
  };
  status: PlanStatus;
  topicSummary: string;
  weeklyFocus: string;
  dailyTimeMinutes: number;
  tasks: ITaskDoc[];
  materials: {
    queries: { yt?: string; books?: string; academic?: string };
    videos: IVideoMaterial[];
    books: IBookMaterial[];
    academic_papers: IPaperMaterial[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITaskDoc>(
  {
    day: { type: Number, required: true, min: 1, max: 7 },
    format: { type: String, required: true },
    title: { type: String, required: true },
    source: { type: String, default: null },
    url: { type: String, default: null },
    estimated_time_minutes: { type: Number, required: true },
    description: { type: String, required: true },
    why_this: { type: String, required: true },
  },
  { _id: false },
);

const PlanSchema: Schema<IPlan> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    input: {
      goalText: { type: String, required: true },
      currentLevel: { type: String, required: true },
      dailyMinutes: { type: Number, required: true },
      preferredFormats: { type: [String], required: true },
    },
    // Legacy plans (created before this field) get default "accepted"
    // — they were already in active use. New plans always start as
    // "draft" (set explicitly in plan.service.save) and need an
    // explicit POST /plan/accept transition.
    status: {
      type: String,
      enum: ["draft", "accepted", "completed"],
      default: "accepted",
      index: true,
    },
    topicSummary: { type: String, required: true },
    weeklyFocus: { type: String, required: true },
    dailyTimeMinutes: { type: Number, required: true },
    tasks: { type: [TaskSchema], required: true },
    materials: {
      queries: {
        yt: { type: String },
        books: { type: String },
        academic: { type: String },
      },
      videos: { type: [Schema.Types.Mixed], default: [] },
      books: { type: [Schema.Types.Mixed], default: [] },
      academic_papers: { type: [Schema.Types.Mixed], default: [] },
    },
  },
  { timestamps: true },
);

export const Plan = mongoose.model<IPlan>("Plan", PlanSchema);
