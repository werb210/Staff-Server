// FILE: server/src/index.ts

import express from "express";
import apiRouter from "./api/index.js";
import internalRoutes from "./routes/internal";

const app = express();

app.use("/api/_int", internalRoutes);

/**
 * HARD GUARANTEES FOR AZURE APP SERVICE
 * - Root path must return 200
 * - Health probe must return 200
 * - Nothing may exit the process
 * - Server must bind to 0.0.0.0
 */

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// --- middleware AFTER probes ---
app.use(express.json());
app.use("/api", apiRouter);

// --- global error safety (LOG ONLY) ---
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

// --- bind server ---
const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on ${HOST}:${PORT}`);
});

// NEVER EXIT
