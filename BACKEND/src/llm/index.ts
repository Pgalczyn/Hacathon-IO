import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { createLLM, type LLMConfig } from "./provider.js";

export interface InvokeOptions extends LLMConfig {
  system?: string;
}

function buildMessages(prompt: string, system?: string): BaseMessage[] {
  const messages: BaseMessage[] = [];
  if (system) messages.push(new SystemMessage(system));
  messages.push(new HumanMessage(prompt));
  return messages;
}

export async function invokeLLM(prompt: string, options: InvokeOptions = {}): Promise<string> {
  const { system, ...llmConfig } = options;
  const llm = createLLM(llmConfig);
  const response = await llm.invoke(buildMessages(prompt, system));
  return typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
}

export async function* streamLLM(
  prompt: string,
  options: InvokeOptions = {},
): AsyncGenerator<string, void, void> {
  const { system, ...llmConfig } = options;
  const llm = createLLM(llmConfig);
  const stream = await llm.stream(buildMessages(prompt, system));
  for await (const chunk of stream) {
    if (typeof chunk.content === "string" && chunk.content.length > 0) {
      yield chunk.content;
    }
  }
}

export { createLLM } from "./provider.js";
export type { LLMConfig, LLMProvider } from "./provider.js";
export { invokeStructured, ExampleSchema, type ExampleOutput, type StructuredOptions } from "./structured.js";
export {
  PlanResponseSchema,
  PlanSchema,
  LearningTaskSchema,
  OnboardingInputSchema,
  TaskFormat,
  PreferredFormat,
  ProficiencyLevel,
  RejectionCategory,
  type PlanResponse,
  type Plan,
  type LearningTask,
  type OnboardingInput,
  type ProficiencyLevelValue,
} from "./schemas.js";
export { generateWeeklyPlan, type GeneratePlanOptions } from "./learningPlan.js";
