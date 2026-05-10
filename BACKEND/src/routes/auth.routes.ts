import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.post("/addUser", authController.register);
authRouter.post("/logout", authController.logout);
authRouter.get("/loggedIn/status", authController.loggedInStatus);
