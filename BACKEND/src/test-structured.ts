import "dotenv/config";
import { invokeStructured, ExampleSchema } from "./llm/index.js";

const result = await invokeStructured(
  "How do I reset my password on this site?",
  ExampleSchema,
);

console.log("Structured reply:", result);
