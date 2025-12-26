import express from "express";
import { requireEnv } from "./env.js";

function validateRequiredEnv() {
  requireEnv("DATABASE_URL");
  requireEnv("JWT_SECRET");
}

validateRequiredEnv();

const app = express();

/* HARD HEALTH CHECK — MUST BE FIRST */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).send("ok");
});

/* DO NOT MOVE THIS ROUTE */

// Azure unconditional probes (MUST be first)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// safety logging only — DO NOT exit
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

const port = Number(process.env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});

void (async () => {
  const { default: apiRouter } = await import("./api/index.js");
  const { default: internalRoutes } = await import("./routes/internal.js");

  app.use("/api/_int", internalRoutes);

  // middleware AFTER health
  app.use(express.json());
  app.use("/api", apiRouter);
})();

export default app;
