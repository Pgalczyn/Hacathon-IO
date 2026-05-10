// src/services/user.service.ts
import { Types } from "mongoose";
import { User, type IUser } from "../models/userBasic.js";
import { Plan } from "../models/plan.js";
import { Review } from "../models/review.js";
import {QuizAttempt, WeeklySummary} from "../models/weeklySummary.js";

export interface UpdateUserInput {
    name?: string;
    surname?: string;
    dateOfBirth?: string;
}

export class UserService {
    async getUserById(userId: string) {
        if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");

        const user = await User.findById(userId).select("-password").lean();
        if (!user) return null;

        // --- 1. Preferences ---
        const latestPlan = await Plan.findOne({ userId }).sort({ createdAt: -1 }).lean();
        let preferences = null;
        if (latestPlan && latestPlan.input) {
            preferences = {
                skillLevel: latestPlan.input.currentLevel,
                topics: latestPlan.topicSummary || latestPlan.input.goalText,
                dailyMinutes: latestPlan.input.dailyMinutes,
                preferredFormats: latestPlan.input.preferredFormats,
            };
        }

        // --- 2. Statistics ---
        const completedWeeks = await Plan.countDocuments({ userId, status: "completed" });
        const totalReviews = await Review.countDocuments({ userId });

        const weeklySummariesCount = await WeeklySummary.countDocuments({ userId });

        const quizAttempts = await QuizAttempt.find({ userId }).select("totalScore").lean();
        const quizzesTaken = quizAttempts.length;
        const avgScoreRaw = quizzesTaken > 0
            ? quizAttempts.reduce((acc, q) => acc + q.totalScore, 0) / quizzesTaken
            : 0;
        const averageQuizScore = Math.round(avgScoreRaw * 100);

        const statistics = {
            completedWeeks,
            totalReviews,
            weeklySummaries: weeklySummariesCount,   // <-- add this field
            quizzesTaken,
            averageQuizScore
        };

        return { ...user, preferences, statistics };
    }

    async updateUser(userId: string, data: UpdateUserInput) {
        if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID");

        // Only allow updating specific fields for security
        const updatePayload: Partial<UpdateUserInput> = {};
        if (data.name) updatePayload.name = data.name;
        if (data.surname) updatePayload.surname = data.surname;
        if (data.dateOfBirth) updatePayload.dateOfBirth = data.dateOfBirth;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updatePayload },
            { new: true, runValidators: true }
        ).select("-password").lean();

        return updatedUser;
    }
}

export const userService = new UserService();