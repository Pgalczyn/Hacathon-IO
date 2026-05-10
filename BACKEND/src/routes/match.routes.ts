import { Router } from "express";
import { matchController } from "../controllers/match.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const matchRouter = Router();

matchRouter.get("/", requireAuth, matchController.list);
