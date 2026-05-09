import type { Request, Response } from "express";
import { onboardingService } from "../services/onboarding.service.js";
import { OnboardingInputSchema } from "../llm/index.js";

export class OnboardingController {
  start = async (req: Request, res: Response): Promise<void> => {
    const parsed = OnboardingInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid onboarding input",
        issues: parsed.error.issues,
      });
      return;
    }

    const userId = req.user?.userID;
    const result = await onboardingService.run(parsed.data, userId ? { userId } : {});
    const status = result.validation.accepted ? 200 : 422;
    res.status(status).json(result);
  };
}

export const onboardingController = new OnboardingController();
