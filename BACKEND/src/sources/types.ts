export interface VideoResult {
  videoId: string;
  title: string;
  thumbnail: string;
  embedUrl: string;
}

export interface BookResult {
  title: string;
  author: string;
  readUrl: string | null;
}

export interface AcademicPaper {
  title: string;
  author: string;
  year: number | null;
  pdfUrl: string | null;
}

/**
 * Strategy interface — every external knowledge source implements this.
 * Adding a new source = new class implementing MaterialSource + register in sources/index.ts.
 */
export interface MaterialSource<TQuery = string, TResult = unknown> {
  readonly name: string;
  fetch(query: TQuery): Promise<TResult>;
}
