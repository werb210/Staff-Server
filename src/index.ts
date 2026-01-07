import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import lenderRoutes from "./routes/lender";
import clientRoutes from "./routes/client";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";

import { notFoundHandler, errorHandler } from "./middleware/errors";
import { assertEnv } from "./config";
import { checkDb } from "./db";
import { runMigrations } from "./migrations";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

assertEnv();

/* -----------------------------
   Core middleware
------------------------------ */
app.use(cors());
app.use(express.json());

/* -----------------------------
   Health check (JSON ONLY)
------------------------------ */
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/* -----------------------------
   API ROUTES — MUST COME FIRST
------------------------------ */
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/lender", lenderRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/reporting", reportingRoutes);
app.use("/api/reports", reportsRoutes);

/* -----------------------------
   API 404 — NEVER HTML
------------------------------ */
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

/* -----------------------------
   SPA STATIC (NON-API ONLY)
------------------------------ */
const distPath = path.resolve(process.cwd(), "dist");

app.use(/^\/(?!api|health).*/, express.static(distPath));

/**
 * IMPORTANT:
 * This regex explicitly EXCLUDES:
 *   /api
 *   /health
 *
 * That guarantees API routes can NEVER return HTML.
 */
app.get(/^\/(?!api|health).*/, (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

/* -----------------------------
   Error handling
------------------------------ */
app.use(notFoundHandler);
app.use(errorHandler);

/* -----------------------------
   Startup
------------------------------ */
async function start() {
  await checkDb();
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`Staff Server running on port ${PORT}`);
  });
}

start();
