import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env lives at the repo root (../../../ from BACKEND/src/scripts/)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config(); // also try BACKEND/.env or process cwd

/**
 * Wipes all per-user content (plans, summaries, reviews, conversations) but
 * keeps the User collection intact so you don't have to re-register. Run with:
 *
 *   npx tsx src/scripts/wipe-user-data.ts
 */
async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set in .env");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongo connection has no db handle");

  const collections = [
    "plans",
    "longtermplans",
    "weeklysummaries",
    "quizattempts",
    "reviews",
    "conversations",
  ];

  for (const name of collections) {
    try {
      const result = await db.collection(name).deleteMany({});
      console.log(`✓ ${name}: deleted ${result.deletedCount}`);
    } catch (err) {
      console.warn(`✗ ${name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
