// src/app.ts
import express, { type NextFunction, type Request, type Response } from "express";
import { materialsRouter } from "./routes/materials.routes.js";
import {learningRouter} from "./routes/learning.routes.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use("/materials", materialsRouter);
  app.use("/learning", learningRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global Error:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  });

  return app;
}