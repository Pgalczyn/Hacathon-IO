import { Router } from "express";
import { materialsController } from "../controllers/materials.controller.js";

export const materialsRouter = Router();

// Ensure these method names (manualSearch, discoverTopic, getOne)
// exist exactly as named in the MaterialsController class.

materialsRouter.get("/", materialsController.manualSearch);
materialsRouter.post("/", materialsController.manualSearch);

materialsRouter.post("/topic", materialsController.discoverTopic);

materialsRouter.get("/:source", materialsController.getOne);