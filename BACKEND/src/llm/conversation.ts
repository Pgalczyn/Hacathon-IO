import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { createLLM, type LLMConfig } from "./provider.js";

export interface ConversationContext {
  topicSummary: string;
  weeklyFocus: string;
  currentLevel: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_TEMPLATE = `You are an experienced tutor helping the user verify and deepen their
understanding after a 7-day learning plan.

Topic: {topic}
This week's focus: {focus}
User's self-described level: {level}

YOUR STYLE:
- Socratic. Ask probing questions before giving answers. Make them
  think.
- Concrete. Anchor questions in real examples, problems, or
  applications, not abstract definitions.
- Brief. Usually 2-3 sentences. One question at a time.
- Encouraging without being sycophantic. Don't say "great question!".
- Match the user's language. If they write in Polish, you write in
  Polish.
- DO NOT lecture. DO NOT dump information. Stay conversational.

WHEN THE USER:
- Asks something factual: give a short direct answer (1-2 sentences),
  then extend with a follow-up question.
- Tries to explain something: probe gently — find the weakest part of
  their explanation and ask about it.
- Goes off-topic: redirect once, politely. If they insist, follow.
- Says "I don't know": offer one small hint or rephrase the question
  more concretely. Don't dump the answer.

LENGTH: keep your turns SHORT. The point is to talk WITH them, not AT
them.`;

function buildSystemPrompt(ctx: ConversationContext): string {
  return SYSTEM_TEMPLATE.replace("{topic}", ctx.topicSummary)
    .replace("{focus}", ctx.weeklyFocus)
    .replace("{level}", ctx.currentLevel);
}

function toBaseMessages(history: ChatMessage[]): BaseMessage[] {
  return history.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content),
  );
}

async function callLLM(messages: BaseMessage[], options: LLMConfig): Promise<string> {
  const llm = createLLM(options);
  const response = await llm.invoke(messages);
  return typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
}

/**
 * Generate the opening assistant turn — a single open question that
 * probes the user's understanding of this week's focus.
 */
export async function generateConversationOpener(
  ctx: ConversationContext,
  options: LLMConfig = {},
): Promise<string> {
  const messages: BaseMessage[] = [
    new SystemMessage(buildSystemPrompt(ctx)),
    new HumanMessage(
      "Start the conversation with ONE open question that probes my understanding of the topic. One sentence, in my language.",
    ),
  ];
  return callLLM(messages, { temperature: 0.6, ...options });
}

/**
 * Continue an existing conversation. `history` includes ALL prior turns
 * (user and assistant). The function returns the next assistant turn.
 */
export async function replyInConversation(
  ctx: ConversationContext,
  history: ChatMessage[],
  options: LLMConfig = {},
): Promise<string> {
  const messages: BaseMessage[] = [
    new SystemMessage(buildSystemPrompt(ctx)),
    ...toBaseMessages(history),
  ];
  return callLLM(messages, { temperature: 0.5, ...options });
}
