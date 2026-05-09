import express, { type Request, type Response } from "express";
import { connectDatabase } from "./dataBase.js";
import {User} from './models/userBasic.js'
import mongoose from "mongoose";

const app = express();
app.use(express.json());

const PORT = 3000;

app.post("/addUser", async (req, res) => {
    try{    const {login,email,password,dateOfBirth} = req.body;

        const newUser = new User({login,email,password,dateOfBirth});
        await newUser.save();

        res.status(200).json({
            status:"success",
            message:"User successfully added."
        })}
    catch(err){
        res.status(500).json({
            status:"error",
            message:err
        })
    }
})


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