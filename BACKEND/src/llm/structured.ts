import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createLLM, type LLMConfig } from "./provider.js";

// Example schema — replace/extend per workflow needs.
export const ExampleSchema = z.object({
  summary: z.string().describe("One-sentence summary of the user's input."),
  intent: z
    .enum(["question", "command", "statement", "other"])
    .describe("Classification of the input."),
  keywords: z.array(z.string()).describe("Notable keywords from the input."),
});

export type ExampleOutput = z.infer<typeof ExampleSchema>;

export interface StructuredOptions extends LLMConfig {
  system?: string;
  /** If the first attempt fails schema validation, retry once with a stricter reprompt. */
  retryOnFailure?: boolean;
}

export async function invokeStructured<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: StructuredOptions = {},
): Promise<z.infer<T>> {
  const { system, retryOnFailure = true, ...llmConfig } = options;
  const llm = createLLM(llmConfig);
  const structured = llm.withStructuredOutput(schema);

  const baseMessages: BaseMessage[] = [];
  if (system) baseMessages.push(new SystemMessage(system));
  baseMessages.push(new HumanMessage(prompt));

  try {
    return (await structured.invoke(baseMessages)) as z.infer<T>;
  } catch (err) {
    if (!retryOnFailure) throw err;
    const stricterSystem =
      (system ? system + "\n\n" : "") +
      "You MUST return output that strictly matches the requested schema. No extra commentary, no markdown.";
    const retryMessages: BaseMessage[] = [
      new SystemMessage(stricterSystem),
      new HumanMessage(prompt),
    ];
    return (await structured.invoke(retryMessages)) as z.infer<T>;
  }
}
