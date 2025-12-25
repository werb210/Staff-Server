import express from "express";
import apiRouter from "./api/index.js";
import internalRoutes from "./routes/internal.js";

const app = express();

/*
 * Azure hard requirements:
 * - Root must return 200
 * - Health check must be fast, unconditional, and before middleware
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.use("/api/_int", internalRoutes);

// middleware AFTER health
app.use(express.json());
app.use("/api", apiRouter);

// safety logging only — DO NOT exit
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

export default app;
