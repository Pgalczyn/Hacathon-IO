import type { Request, Response } from "express";
import { materialsService } from "../services/materials.service.js";
import { SOURCE_KEYS, type SourceKey } from "../sources/index.js";

export class MaterialsController {
  /** Helper to parse sources from body or query */
  private getRequestedSources = (req: Request): SourceKey[] => {
    const raw = req.body?.sources || req.query?.sources;
    if (!raw) return [...SOURCE_KEYS];

    const list = Array.isArray(raw) ? raw : String(raw).split(",");
    const filtered = list.filter((s): s is SourceKey =>
        SOURCE_KEYS.includes(s.trim() as SourceKey)
    );

    return filtered.length > 0 ? filtered : [...SOURCE_KEYS];
  };

  /**
   * Endpoint: Manual Search
   * Corresponds to materialsRouter.get("/") and .post("/")
   */
  manualSearch = async (req: Request, res: Response): Promise<void> => {
    const sources = this.getRequestedSources(req);
    const queries = {
      yt: (req.body?.yt || req.query?.yt) as string,
      books: (req.body?.books || req.query?.books) as string,
      academic: (req.body?.academic || req.query?.academic) as string,
    };

    const bundle = await materialsService.fetchByQueries(queries, sources);
    res.json(bundle);
  };

  /**
   * Endpoint: AI Discovery
   * Corresponds to materialsRouter.post("/topic")
   */
  discoverTopic = async (req: Request, res: Response): Promise<void> => {
    const topic = String(req.body?.topic ?? "").trim();
    if (!topic) {
      res.status(400).json({ error: "Property 'topic' is required." });
      return;
    }

    const sources = this.getRequestedSources(req);
    const bundle = await materialsService.fetchByTopic(topic, sources);
    res.json(bundle);
  };

  /**
   * Endpoint: Single Source
   * Corresponds to materialsRouter.get("/:source")
   */
  getOne = async (req: Request, res: Response): Promise<void> => {
    const source = req.params.source as SourceKey;
    if (!SOURCE_KEYS.includes(source)) {
      res.status(400).json({ error: "Invalid source key" });
      return;
    }
    const q = String(req.query.q ?? "");
    res.json(await materialsService.fetchOne(source, q));
  };
}

export const materialsController = new MaterialsController();