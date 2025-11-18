// server/src/index.ts
import "dotenv/config";
import { app } from "./app.js";
import prisma from "./db/index.js";

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    console.log("Connecting to database…");
    await prisma.$connect();
    console.log("Connected.");

    app.listen(PORT, () => {
      console.log(`🚀 Staff API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
