import { z } from "zod";
import { invokeStructured } from "../llm/index.js";

export const MaterialQueriesSchema = z.object({
  yt: z
    .string()
    .describe(
      "YouTube search query — concise terms targeting educational/explainer videos for this topic.",
    ),
  books: z
    .string()
    .describe(
      "Project Gutenberg search query — a single keyword, author surname, or short phrase likely to match a public-domain book related to the topic.",
    ),
  academic: z
    .string()
    .describe(
      "OpenAlex academic search query — precise technical terminology a researcher would use to find peer-reviewed papers on this topic.",
    ),
});

export type PlannedQueries = z.infer<typeof MaterialQueriesSchema>;

const SYSTEM_PROMPT = `You are a research assistant. Given a user's topic of interest, produce ONE search query optimized for each of three sources:
- YouTube (educational explainer videos)
- Project Gutenberg (public-domain literature)
- OpenAlex (academic papers)

Each query must be tuned to that source's strengths and conventions:
- YouTube → natural-language phrase a learner would type.
- Gutenberg → minimal keywords (often a single word or author name); the corpus is pre-1925 so prefer classical/historical terms.
- OpenAlex → technical/scientific terminology.

Return only the queries. Do not add commentary.`;

export class QueryPlannerService {
  plan(topic: string): Promise<PlannedQueries> {
    return invokeStructured(topic, MaterialQueriesSchema, { system: SYSTEM_PROMPT });
  }
}

export const queryPlannerService = new QueryPlannerService();
