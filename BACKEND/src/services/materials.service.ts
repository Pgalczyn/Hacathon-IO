import {
  sources,
  type SourceKey,
  type VideoResult,
  type BookResult,
  type AcademicPaper,
  SOURCE_KEYS,
} from "../sources/index.js";
import { queryPlannerService } from "./query-planner.service.js";

export interface MaterialQueries {
  yt?: string;
  books?: string;
  academic?: string;
}

export interface MaterialBundle {
  topic?: string;
  queries: MaterialQueries;
  videos: VideoResult[];
  books: BookResult[];
  academic_papers: AcademicPaper[];
}

export class MaterialsService {
  /**
   * Fetches data for requested sources.
   * Non-requested sources will return empty arrays [].
   */
  async fetchByQueries(
      queries: MaterialQueries,
      requestedSources: SourceKey[] = [...SOURCE_KEYS]
  ): Promise<MaterialBundle> {
    // 1. Initialize result with empty lists
    const bundle: MaterialBundle = {
      queries,
      videos: [],
      books: [],
      academic_papers: [],
    };

    // 2. Prepare tasks only for requested sources that have a query
    const tasks: { key: SourceKey; promise: Promise<any> }[] = [];

    if (requestedSources.includes("yt") && queries.yt) {
      tasks.push({ key: "yt", promise: sources.yt.fetch(queries.yt) });
    }
    if (requestedSources.includes("books") && queries.books) {
      tasks.push({ key: "books", promise: sources.books.fetch(queries.books) });
    }
    if (requestedSources.includes("academic") && queries.academic) {
      tasks.push({ key: "academic", promise: sources.academic.fetch(queries.academic) });
    }

    // 3. Execute in parallel
    const results = await Promise.allSettled(tasks.map(t => t.promise));

    // 4. Assign results to the bundle
    results.forEach((result, index) => {
      const task = tasks[index];
      if (!task) return;
      const sourceKey = task.key;
      const data = result.status === "fulfilled" ? result.value : [];

      if (sourceKey === "yt") bundle.videos = data;
      if (sourceKey === "books") bundle.books = data;
      if (sourceKey === "academic") bundle.academic_papers = data;
    });

    return bundle;
  }

  async fetchByTopic(topic: string, requestedSources?: SourceKey[]): Promise<MaterialBundle> {
    const queries = await queryPlannerService.plan(topic);
    const bundle = await this.fetchByQueries(queries, requestedSources);
    return { ...bundle, topic };
  }

  fetchOne<K extends SourceKey>(key: K, query: string) {
    return sources[key].fetch(query);
  }
}

export const materialsService = new MaterialsService();