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

export { createLLM } from "./provider.js";
export type { LLMConfig, LLMProvider } from "./provider.js";
export { invokeStructured, type StructuredOptions } from "./structured.js";

export {
  OnboardingFormInputSchema,
  TaskFormat,
  type OnboardingFormInput,
} from "./learning-schemas.js";