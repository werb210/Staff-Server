import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { verifyDbConnection } from "./db";

const PORT = Number(process.env.PORT) || 8080;

async function start() {
  await verifyDbConnection();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Staff-Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
