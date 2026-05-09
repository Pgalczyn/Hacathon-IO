import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from "express";
import cors from 'cors';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import bcrypt from "bcrypt";
import { connectDatabase } from "./dataBase.js";
import { User } from './models/userBasic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("BŁĄD: Krytyczny brak JWT_SECRET w .env!");
    process.exit(1);
}

const app = express();


app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());

// ENDPOINTS
app.get("/loggedIn/status", (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ isLoggedIn: false, message: "No token" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET as string) as any;
        res.status(200).json({
            isLoggedIn: true,
            user: { userID: decoded.userID, login: decoded.login }
        });
    } catch (err) {
        res.status(401).json({ isLoggedIn: false, message: "Session expired." });
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

        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // na localhost false
            maxAge: 3600000
        });

        res.status(200).json({ message: "LoggedIN !!!", login: user.login });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

app.post("/addUser", async (req, res) => {
    try {
        const { login, email, password, dateOfBirth, name, surname } = req.body;

        const newUser = new User({
            login, email, password, dateOfBirth, name, surname
        });
        await newUser.save();

        res.status(200).json({ status: "success", message: "User successfully added." });
    } catch (err: any) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

async function startServer() {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            console.log(`✅ Serwer działa na porcie ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Błąd startu serwera:", error);
    }
}

startServer();