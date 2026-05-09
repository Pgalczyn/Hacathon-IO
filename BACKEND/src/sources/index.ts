import { YouTubeSource } from "./youtube.source.js";
import { GutendexSource } from "./gutendex.source.js";
import { OpenAlexSource } from "./openalex.source.js";

/**
 * Registry of available material sources.
 * To add a new source: implement MaterialSource, then add it here under a stable key.
 */
export const sources = {
  yt: new YouTubeSource(),
  books: new GutendexSource(),
  academic: new OpenAlexSource(),
} as const;

export type SourceKey = keyof typeof sources;
export const SOURCE_KEYS: readonly SourceKey[] = Object.keys(sources) as SourceKey[];

export * from "./types.js";
