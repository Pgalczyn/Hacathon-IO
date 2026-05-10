// src/controllers/user.controller.ts
import type { Request, Response } from "express";
import { userService } from "../services/user.service.js";

export class UserController {
    getProfile = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user?.userID;
        if (!userId) { res.status(401).json({ message: "Authentication required" }); return; }

        try {
            const user = await userService.getUserById(userId);
            if (!user) { res.status(404).json({ message: "User not found" }); return; }
            res.status(200).json(user);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(500).json({ error: "Failed to fetch user profile", message });
        }
    };

    updateProfile = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user?.userID;
        if (!userId) { res.status(401).json({ message: "Authentication required" }); return; }

        try {
            const updatedUser = await userService.updateUser(userId, req.body);
            res.status(200).json(updatedUser);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(400).json({ error: "Failed to update profile", message });
        }
    };
}

export const userController = new UserController();