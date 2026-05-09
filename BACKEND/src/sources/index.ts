import { YouTubeSource } from "./youtube.source.js";
import { GutendexSource } from "./gutendex.source.js";
import { OpenAlexSource } from "./openalex.source.js";


export const sources = {
  yt: new YouTubeSource(),
  books: new GutendexSource(),
  academic: new OpenAlexSource(),
} as const;

export type SourceKey = keyof typeof sources;
export const SOURCE_KEYS: readonly SourceKey[] = Object.keys(sources) as SourceKey[];

export * from "./types.js";
