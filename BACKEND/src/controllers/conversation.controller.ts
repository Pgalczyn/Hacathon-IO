import type { Request, Response } from "express";
import { z } from "zod";
import { conversationService } from "../services/conversation.service.js";

const StartBodySchema = z.object({
  planId: z.string().optional(),
});

const SendMessageBodySchema = z.object({
  content: z.string().min(1).max(4000),
});

export class ConversationController {
  start = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const parsed = StartBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    try {
      const convo = await conversationService.start(
        userId,
        parsed.data.planId,
      );
      res.status(201).json(convo);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No plan") ? 404 : 500;
      res.status(status).json({ error: "Failed to start conversation", message });
    }
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const id = String(req.params.id ?? "");
    const parsed = SendMessageBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    try {
      const convo = await conversationService.sendMessage(
        userId,
        id,
        parsed.data.content,
      );
      res.status(200).json(convo);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("not found") ? 404 : 500;
      res.status(status).json({ error: "Failed to send message", message });
    }
  };

  getOne = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const id = String(req.params.id ?? "");
    try {
      const convo = await conversationService.getById(userId, id);
      if (!convo) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(convo);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to load conversation", message });
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const items = await conversationService.listForUser(userId);
      res.json(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to list conversations", message });
    }
  };
}

export const conversationController = new ConversationController();
