import "dotenv/config";
import { invokeLLM } from "./llm/index.js";

const reply = await invokeLLM("Say 'pong' and nothing else.", {
  system: "You are a terse health-check responder.",
});

console.log("LLM reply:", reply);
