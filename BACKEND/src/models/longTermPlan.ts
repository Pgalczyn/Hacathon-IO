import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ILongTermTask {
  day: number;
  title: string;
}

export interface IMonthlyPlan {
  monthIndex: number;
  theme: string;
  tasks: ILongTermTask[];
}

export interface ILongTermPlan extends Document {
  userId: Types.ObjectId;
  input: {
    goalText: string;
    currentLevel: string;
    preferredFormats: string[];
  };
  yearStartDate: Date;
  topicSummary: string;
  yearlyFocus: string;
  months: IMonthlyPlan[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ILongTermTask>(
  {
    day: { type: Number, required: true, min: 1, max: 31 },
    title: { type: String, required: true },
  },
  { _id: false },
);

const MonthlyPlanSubSchema = new Schema<IMonthlyPlan>(
  {
    monthIndex: { type: Number, required: true, min: 1, max: 12 },
    theme: { type: String, required: true },
    tasks: { type: [TaskSchema], required: true },
  },
  { _id: false },
);

const LongTermPlanSchema: Schema<ILongTermPlan> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    input: {
      goalText: { type: String, required: true },
      currentLevel: { type: String, required: true },
      preferredFormats: { type: [String], required: true },
    },
    yearStartDate: { type: Date, required: true },
    topicSummary: { type: String, required: true },
    yearlyFocus: { type: String, required: true },
    months: { type: [MonthlyPlanSubSchema], required: true },
  },
  { timestamps: true },
);

export const LongTermPlan = mongoose.model<ILongTermPlan>(
  "LongTermPlan",
  LongTermPlanSchema,
);
