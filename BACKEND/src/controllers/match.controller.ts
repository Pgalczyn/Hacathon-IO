import type { Request, Response } from "express";
import { matchService } from "../services/match.service.js";

export class MatchController {
  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : 10;
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 10;

    try {
      const matches = await matchService.findMatches(userId, safeLimit);
      res.json({ matches });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to find matches", message });
    }
  };
}

export const matchController = new MatchController();
