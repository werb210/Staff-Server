import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import lenderRoutes from "./routes/lender";
import clientRoutes from "./routes/client";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";

import { assertEnv } from "./config";
import { checkDb } from "./db";
import { runMigrations } from "./migrations";
import { errorHandler } from "./middleware/errors";

const PORT = Number(process.env.PORT) || 8080;

export async function startServer() {
  assertEnv();
  await checkDb();
  await runMigrations();
  console.log("BOOT OK");

  const app = express();

  app.use(cors());
  app.use(express.json());

  /* -------------------- HEALTH -------------------- */
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  /* -------------------- API ROUTES -------------------- */
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/lender", lenderRoutes);
  app.use("/api/client", clientRoutes);
  app.use("/api/reporting", reportingRoutes);
  app.use("/api/reports", reportsRoutes);

  /* -------------------- API ERRORS (JSON ONLY) -------------------- */
  app.use("/api", errorHandler);

  /* -------------------- API 404 (JSON ONLY) -------------------- */
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  /* -------------------- GLOBAL 404 (NO HTML) -------------------- */
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  console.log("BOOT OK");

  app.listen(PORT, () => {
    console.log(`Staff Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  void startServer();
}
