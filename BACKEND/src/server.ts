import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createApp } from "./app.js";
import { connectDatabase } from "./db/connection.js";

// Load .env from the BACKEND/ directory (one level up from src/), with a
// fallback to the repo root so devs can keep a single .env.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(__dirname, "../../.env") });

const port = Number(process.env.PORT ?? 3000);

async function start() {
  // Kick off Mongo connect but don't block the listen — it has a 3s timeout
  // and any failure is logged as a warning. Endpoints that need the DB will
  // surface their own 500s if Mongo is still down by the time they're hit.
  void connectDatabase();

  const app = createApp();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
