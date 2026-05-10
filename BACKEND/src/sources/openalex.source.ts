import axios from "axios";
import type { MaterialSource, AcademicPaper } from "./types.js";

interface OpenAlexWork {
  display_name: string;
  publication_year: number | null;
  authorships: { author: { display_name: string } }[];
  open_access?: { oa_url?: string | null };
  primary_location?: { pdf_url?: string | null };
}

export class OpenAlexSource implements MaterialSource<string, AcademicPaper[]> {
  readonly name = "openalex";

  constructor(
    private readonly contactEmail: string = process.env.OPENALEX_EMAIL ?? "test@example.com",
    private readonly perPage: number = 3,
  ) {}

  async fetch(query: string): Promise<AcademicPaper[]> {
    if (!query) return [];
    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=is_oa:true&per-page=${this.perPage}&mailto=${this.contactEmail}`;
      const { data } = await axios.get<{ results: OpenAlexWork[] }>(url);
      return data.results.map((paper) => ({
        title: paper.display_name,
        author: paper.authorships[0]?.author?.display_name ?? "Research team",
        year: paper.publication_year ?? null,
        pdfUrl: paper.open_access?.oa_url ?? paper.primary_location?.pdf_url ?? null,
      }));
    } catch (err) {
      console.error(`OpenAlex error for "${query}":`, (err as Error).message);
      return [];
    }
  }
}
