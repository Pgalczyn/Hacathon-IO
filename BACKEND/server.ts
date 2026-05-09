import express, { type Request, type Response } from "express";
import { connectDatabase } from "./dataBase.js";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

const PORT = 3000;

// 1. Definicja prostego modelu do testów
const UserSchema = new mongoose.Schema({
    name: String,
    email: String
});
const User = mongoose.model("User", UserSchema);

// 2. Endpoint do testowania zapisu (POST)
app.post("/users", async (req: Request, res: Response) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json({ message: "Użytkownik zapisany!", user: newUser });
    } catch (error) {
        res.status(500).json({ message: "Błąd zapisu", error });
    }
});

// 3. Endpoint do testowania odczytu (GET)
app.get("/users", async (req: Request, res: Response) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Błąd pobierania", error });
    }
});

app.get('/', (req: Request, res: Response) => {
    res.send('Hello TypeScript Express z MongoDB!');
});

app.get('/status', (req: Request, res: Response) => {
    const states = ['rozłączony', 'połączony', 'łączy się', 'rozłącza się'];
    const state = mongoose.connection.readyState;

    res.json({
        status: states[state] || 'nieznany',
        dbName: mongoose.connection.name,
        readyState: state
    });
});

// 4. Funkcja startowa - najpierw baza, potem serwer
async function startServer() {
    try {
        await connectDatabase(); // Czekamy na bazę

        app.listen(PORT, () => {
            console.log(`✅ Serwer działa na porcie ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Serwer nie mógł wystartować z powodu błędu bazy.");
    }
}

startServer();