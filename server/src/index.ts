/* ============================================================
   DIAGNOSTIC STARTUP HEADER — REQUIRED FOR AZURE DEBUGGING
   ============================================================ */

console.log("\n==============================================");
console.log("=== STAFF SERVER STARTUP DIAGNOSTICS (AZURE) ===");
console.log("Time:", new Date().toISOString());
console.log("CWD:", process.cwd());
console.log("ENV: production");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("DATABASE_URL present:", process.env.DATABASE_URL ? "YES" : "NO");
console.log("OPENAI_API_KEY present:", process.env.OPENAI_API_KEY ? "YES" : "NO");
console.log(
  "AZURE_STORAGE_CONNECTION_STRING present:",
  process.env.AZURE_STORAGE_CONNECTION_STRING ? "YES" : "NO",
);
console.log("PATH:", process.env.PATH);
console.log("==============================================\n");

/* ============================================================
   ORIGINAL FILE IMPORTS BEGIN BELOW THIS LINE
   ============================================================ */

import http from "http";
import app from "./app.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

async function startServer() {
  try {
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log("=== STAFF SERVER STARTED ===");
      console.log("PORT:", PORT);
      console.log("NODE_ENV:", process.env.NODE_ENV);
      console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
      console.log("=================================");
    });

    server.on("error", (err) => {
      console.error("SERVER ERROR:", err);
      process.exit(1);
    });
  } catch (err) {
    console.error("FATAL STARTUP ERROR:", err);
    process.exit(1);
  }
}

startServer();
