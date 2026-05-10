import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IConversationMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId | null;
  topicSummary: string;
  weeklyFocus: string;
  currentLevel: string;
  messages: IConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IConversationMessage>(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ConversationSchema: Schema<IConversation> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", default: null, index: true },
    topicSummary: { type: String, required: true },
    weeklyFocus: { type: String, required: true },
    currentLevel: { type: String, required: true },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema,
);
