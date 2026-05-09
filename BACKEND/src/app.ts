// src/app.ts
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "./models/userBasic.js";
import { materialsRouter } from "./routes/materials.routes.js";
import { learningRouter } from "./routes/learning.routes.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not defined in environment");
  process.exit(1);
}
// Explicitly narrow the type – we know it’s a string from this point on
const SECRET: string = JWT_SECRET as string;

export function createApp() {
  const app = express();

  // ---------- Global Middleware ----------
  app.use(express.json());
  app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
      })
  );
  app.use(cookieParser());

  // ---------- Health Check ----------
  app.get("/health", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // ---------- Authentication Routes ----------
  app.get("/loggedIn/status", (req, res) => {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ isLoggedIn: false, message: "No token" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userID: string; login: string };
      res.status(200).json({
        isLoggedIn: true,
        user: { userID: decoded.userID, login: decoded.login },
      });
    } catch (err) {
      res.status(401).json({ isLoggedIn: false, message: "Session expired" });
    }
  });

  app.post("/login", async (req, res) => {
    try {
      const { login, password } = req.body;
      const user = await User.findOne({ login });
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const token = jwt.sign(
          { userID: user._id, login: user.login },
          JWT_SECRET,
          { expiresIn: "1h" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000,
      });

      res.json({ message: "Logged in", login: user.login });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/addUser", async (req, res) => {
    try {
      const { login, email, password, dateOfBirth, name, surname } = req.body;

      // Check for duplicate login or email
      const existing = await User.findOne({ $or: [{ login }, { email }] });
      if (existing) {
        const field = existing.login === login ? "Login" : "Email";
        return res.status(409).json({ status: "error", message: `${field} already exists` });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        login,
        email,
        password: hashedPassword,
        dateOfBirth,
        name,
        surname,
      });
      await newUser.save();

      res.status(200).json({ status: "success", message: "User successfully added." });
    } catch (err: any) {
      // Fallback duplicate key error (if unique indexes are set in the model)
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({ status: "error", message: `${field} already exists` });
      }
      console.error(err);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  });

  // ---------- Feature Routers ----------
  app.use("/materials", materialsRouter);
  app.use("/learning", learningRouter);

  // ---------- Global Error Handler ----------
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global Error:", err);
    const isDev = process.env.NODE_ENV !== "production";
    res.status(500).json({
      error: "Internal server error",
      message: isDev ? err.message : "Something went wrong",
      ...(isDev && { stack: err.stack }),
    });
  });

  return app;
}