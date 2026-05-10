// src/app.ts
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { materialsRouter } from "./routes/materials.routes.js";
import { onboardingRouter } from "./routes/onboarding.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { planRouter } from "./routes/plan.routes.js";
import { reviewRouter } from "./routes/review.routes.js";
import { weeklySummaryRouter } from "./routes/weeklySummary.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { longTermPlanRouter } from "./routes/longTermPlan.routes.js";
import { optionalAuth } from "./middleware/auth.middleware.js";
import {userRouter} from "./routes/user.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use(authRouter);
  app.use("/materials", materialsRouter);
  app.use("/onboarding", optionalAuth, onboardingRouter);
  app.use("/plan", planRouter);
  app.use("/reviews", reviewRouter);
  app.use("/week/summary", weeklySummaryRouter);
  app.use("/conversation", conversationRouter);
  app.use("/longplan", longTermPlanRouter);
  app.use("/user", userRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  });

  return app;
}
