import { Router } from "express";
import { onboardingController } from "../controllers/onboarding.controller.js";

export const onboardingRouter = Router();

onboardingRouter.post("/", onboardingController.start);
