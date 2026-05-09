import type { Request, Response, NextFunction } from "express";
import { authService, type JwtPayload } from "../services/auth.service.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

/**
 * Express middleware that requires a valid JWT cookie.
 * Attaches the decoded payload to `req.user`. Use on protected routes:
 *
 *   router.get("/me", requireAuth, controller.me);
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.token as string | undefined;
  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    req.user = authService.verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Sets req.user if a valid JWT cookie is present, but never blocks the
 * request. Use on routes that work for both anonymous and signed-in users
 * but want to associate work with the user when possible.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.token as string | undefined;
  if (token) {
    try {
      req.user = authService.verifyToken(token);
    } catch {
      // ignore — treat as anonymous
    }
  }
  next();
}
