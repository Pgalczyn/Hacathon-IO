import type { Request, Response } from "express";
import { z } from "zod";
import { weeklySummaryService } from "../services/weeklySummary.service.js";

const GenerateBodySchema = z.object({
  planId: z.string().optional(),
});

const QuizSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        value: z.union([z.string(), z.number()]).transform((v) => String(v)),
      }),
    )
    .min(1),
});

/**
 * For the GET endpoints we strip `correctOption` so the right answer
 * isn't shipped with the questions. The grader still needs it server-side.
 */
function publicizeSummary(doc: Record<string, unknown> & { quiz?: unknown[] }) {
  const quiz = Array.isArray(doc.quiz)
    ? doc.quiz.map((q) => {
        const { correctOption: _omit, ...rest } = q as Record<string, unknown>;
        return rest;
      })
    : doc.quiz;
  return { ...doc, quiz };
}

export class WeeklySummaryController {
  generate = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const parsed = GenerateBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    try {
      const summary = await weeklySummaryService.generateForUser({
        userId,
        ...(parsed.data.planId !== undefined ? { planId: parsed.data.planId } : {}),
      });
      const obj = summary.toObject ? summary.toObject() : (summary as unknown as Record<string, unknown>);
      res.status(201).json(publicizeSummary(obj));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("No plan") ? 404 : 500;
      res.status(status).json({ error: "Failed to generate summary", message });
    }
  };

  getLatest = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      const summary = await weeklySummaryService.getLatestForUser(userId);
      if (!summary) {
        res.status(404).json({ message: "No weekly summary yet" });
        return;
      }
      res.json(publicizeSummary(summary as unknown as Record<string, unknown>));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to load summary", message });
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
      const summary = await weeklySummaryService.getById(userId, id);
      if (!summary) {
        res.status(404).json({ message: "Not found" });
        return;
      }
      res.json(publicizeSummary(summary as unknown as Record<string, unknown>));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to load summary", message });
    }
  };

  gradeQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userID;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const id = String(req.params.id ?? "");
    const parsed = QuizSubmitSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid answers", issues: parsed.error.issues });
      return;
    }
    try {
      const attempt = await weeklySummaryService.gradeAnswers({
        userId,
        summaryId: id,
        answers: parsed.data.answers,
      });
      res.status(201).json(attempt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes("not found") ? 404 : 500;
      res.status(status).json({ error: "Failed to grade quiz", message });
    }
  };
}

export const weeklySummaryController = new WeeklySummaryController();
