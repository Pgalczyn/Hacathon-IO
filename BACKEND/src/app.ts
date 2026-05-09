// src/app.ts
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { materialsRouter } from "./routes/materials.routes.js";
import {authRouter} from "./routes/auth.routes.js";
import {optionalAuth} from "./middleware/auth.middleware.js";
import {planRouter} from "./routes/plan.routes.js";

export function createApp() {
  const app = express();

  app.use(cors({ credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use(authRouter);
  app.use("/materials", materialsRouter);
  app.use("/plan", planRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  });

  return app;
}
