import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const conversationRouter = Router();

conversationRouter.post("/", requireAuth, conversationController.start);
conversationRouter.get("/", requireAuth, conversationController.list);
conversationRouter.get("/:id", requireAuth, conversationController.getOne);
conversationRouter.post("/:id", requireAuth, conversationController.sendMessage);
