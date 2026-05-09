import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./dataBase.js";

const port = Number(process.env.PORT ?? 3000);

async function startServer() {
  try {
    // await connectDatabase();

    const app = createApp();

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("❌ Błąd startu serwera:", error);
    process.exit(1);
  }
}

startServer();