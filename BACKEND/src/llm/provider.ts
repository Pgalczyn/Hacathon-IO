import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGroq } from "@langchain/groq";
import { ChatAnthropic } from "@langchain/anthropic";

export type LLMProvider = "groq" | "anthropic";

export interface LLMConfig {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  apiKey?: string;
}

export function createLLM(config: LLMConfig = {}): BaseChatModel {
  const provider =
    config.provider ?? (process.env.LLM_PROVIDER as LLMProvider | undefined) ?? "groq";
  const temperature = config.temperature ?? 0;

  switch (provider) {
    case "groq": {
      const apiKey = config.apiKey ?? process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not set");
      return new ChatGroq({
        apiKey,
        model: config.model ?? process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
        temperature,
      });
    }
    case "anthropic": {
      const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
      return new ChatAnthropic({
        apiKey,
        model: config.model ?? process.env.LLM_MODEL ?? "claude-sonnet-4-6",
        temperature,
      });
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider satisfies never}`);
  }
}
