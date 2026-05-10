// src/routes/user.routes.ts
import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const userRouter = Router();

// Endpoint: GET /user/me
userRouter.get("/me", requireAuth, userController.getProfile);
userRouter.put("/me", requireAuth, userController.updateProfile);