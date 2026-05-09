import axios from "axios";
import type { MaterialSource, BookResult } from "./types.js";

interface GutendexBook {
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
}

export class GutendexSource implements MaterialSource<string, BookResult[]> {
  readonly name = "gutendex";

  constructor(private readonly limit: number = 3) {}

  async fetch(query: string): Promise<BookResult[]> {
    if (!query) return [];
    try {
      const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
      const { data } = await axios.get<{ results: GutendexBook[] }>(url);
      return data.results.slice(0, this.limit).map((book) => ({
        title: book.title,
        author: book.authors[0]?.name ?? "Unknown",
        readUrl:
          book.formats["text/html"] ?? book.formats["application/epub+zip"] ?? null,
      }));
    } catch (err) {
      console.error(`Gutendex error for "${query}":`, (err as Error).message);
      return [];
    }
  }
}
