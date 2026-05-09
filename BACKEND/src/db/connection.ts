import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/HacathonDB";

mongoose.connection.on("error", (err) => {
  console.error(`MongoDB error: ${err}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Will retry on next operation.");
});

/**
 * Connects to MongoDB with a short server-selection timeout so the API can
 * still start up when Mongo isn't running locally — endpoints that touch the
 * DB will fail individually, but /health, /onboarding (sans persistence),
 * /materials/* etc. keep working.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  MongoDB unavailable: ${message}`);
    console.warn("   API will start anyway. Auth endpoints will fail until Mongo is up.");
  }
}
