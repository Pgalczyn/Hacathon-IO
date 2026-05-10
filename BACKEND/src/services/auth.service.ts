import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, type IUser } from "../models/userBasic.js";

export interface RegisterInput {
  login: string;
  email: string;
  password: string;
  dateOfBirth: string | Date;
  name: string;
  surname: string;
}

export interface LoginResult {
  token: string;
  login: string;
  userID: string;
}

export interface JwtPayload {
  userID: string;
  login: string;
}

const JWT_EXPIRES_IN_SECONDS = 60 * 60; // 1h

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export class AuthService {
  async register(input: RegisterInput): Promise<IUser> {
    const birthDate = new Date(input.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 13) {
      throw new AuthError("You must be at least 13 years old to register!", 400);
    }
    const newUser = new User(input);
    return newUser.save();
  }

  async login(loginValue: string, password: string): Promise<LoginResult> {
    const user = await User.findOne({ login: loginValue });
    if (!user) throw new AuthError("User not found", 401);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new AuthError("Invalid password", 401);

    const payload: JwtPayload = {
      userID: String(user._id),
      login: user.login,
    };
    const token = jwt.sign(payload, getJwtSecret(), {
      expiresIn: JWT_EXPIRES_IN_SECONDS,
    });

    return { token, login: user.login, userID: payload.userID };
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  }

  cookieMaxAgeMs(): number {
    return JWT_EXPIRES_IN_SECONDS * 1000;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const authService = new AuthService();
