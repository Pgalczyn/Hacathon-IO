import { Types } from "mongoose";
import { Conversation, type IConversation } from "../models/conversation.js";
import { Plan, type IPlan } from "../models/plan.js";
import {
  generateConversationOpener,
  replyInConversation,
  type ChatMessage,
  type ConversationContext,
} from "../llm/index.js";

export class ConversationService {
  /**
   * Start a new conversation grounded in a user's plan. The first
   * assistant turn is generated immediately (an open question).
   */
  async start(userId: string, planId?: string): Promise<IConversation> {
    const plan = await this.resolvePlan(userId, planId);
    if (!plan) throw new Error("No plan to base conversation on");

    const ctx = this.buildContext(plan);
    const opener = await generateConversationOpener(ctx);

    const doc = new Conversation({
      userId,
      planId: plan._id,
      topicSummary: plan.topicSummary,
      weeklyFocus: plan.weeklyFocus,
      currentLevel: plan.input.currentLevel,
      messages: [{ role: "assistant", content: opener, createdAt: new Date() }],
    });
    return doc.save();
  }

  /**
   * Append the user's message, ask the LLM for the next assistant turn,
   * append it, and persist. Returns the updated conversation.
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    userContent: string,
  ): Promise<IConversation> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new Error("Invalid conversation id");
    }
    const convo = await Conversation.findOne({ _id: conversationId, userId });
    if (!convo) throw new Error("Conversation not found");

    const trimmed = userContent.trim();
    if (trimmed.length === 0) throw new Error("Message is empty");

    convo.messages.push({ role: "user", content: trimmed, createdAt: new Date() });

    const ctx: ConversationContext = {
      topicSummary: convo.topicSummary,
      weeklyFocus: convo.weeklyFocus,
      currentLevel: convo.currentLevel,
    };
    const history: ChatMessage[] = convo.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await replyInConversation(ctx, history);
    convo.messages.push({ role: "assistant", content: reply, createdAt: new Date() });
    return convo.save();
  }

  async getById(userId: string, id: string): Promise<IConversation | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Conversation.findOne({ _id: id, userId }).lean<IConversation>();
  }

  /** List user's conversations without the messages (for a sidebar / index). */
  async listForUser(userId: string): Promise<IConversation[]> {
    return Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .select("-messages")
      .lean<IConversation[]>();
  }

  private async resolvePlan(userId: string, planId?: string): Promise<IPlan | null> {
    if (planId && Types.ObjectId.isValid(planId)) {
      return Plan.findOne({ _id: planId, userId }).lean<IPlan>();
    }
    return Plan.findOne({ userId }).sort({ createdAt: -1 }).lean<IPlan>();
  }

  private buildContext(plan: IPlan): ConversationContext {
    return {
      topicSummary: plan.topicSummary,
      weeklyFocus: plan.weeklyFocus,
      currentLevel: plan.input.currentLevel,
    };
  }
}

export const conversationService = new ConversationService();
