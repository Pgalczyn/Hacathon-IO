import type { Request, Response } from "express";
import { authService, AuthError } from "../services/auth.service.js";

export class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { login, email, password, dateOfBirth, name, surname } = req.body ?? {};
      await authService.register({ login, email, password, dateOfBirth, name, surname });
      res.status(201).json({ status: "success", message: "User successfully added." });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ status: "error", message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { login, password } = req.body ?? {};
      if (!login || !password) {
        res.status(400).json({ message: "login and password are required" });
        return;
      }
      const result = await authService.login(login, password);
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: false,
        maxAge: authService.cookieMaxAgeMs(),
      });
      res.status(200).json({ message: "LoggedIN !!!", login: result.login });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ message: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ message: "Server Error" });
    }
  };

  logout = (_req: Request, res: Response): void => {
    res.clearCookie("token", { httpOnly: true });
    res.status(200).json({ message: "Logged out" });
  };

  loggedInStatus = (req: Request, res: Response): void => {
    const token = req.cookies?.token as string | undefined;
    if (!token) {
      res.status(401).json({ isLoggedIn: false, message: "No token" });
      return;
    }
    try {
      const decoded = authService.verifyToken(token);
      res.status(200).json({
        isLoggedIn: true,
        user: { userID: decoded.userID, login: decoded.login },
      });
    } catch {
      res.status(401).json({ isLoggedIn: false, message: "Session expired." });
    }
  };
}

export const authController = new AuthController();
