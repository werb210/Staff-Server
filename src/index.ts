import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";

import { assertEnv } from "./config";
import { errorHandler } from "./middleware/errors";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

const PORT = Number(process.env.PORT) || 8080;

export async function startServer() {
  assertEnv();
  const { checkDb } = await import("./db");
  const { runMigrations } = await import("./migrations");
  await checkDb();
  await runMigrations();
  console.log("BOOT OK");

  const app = express();

  app.use(cors());
  app.use(express.json());

  const { default: authRoutes } = await import("./routes/auth");
  const { default: usersRoutes } = await import("./routes/users");
  const { default: staffRoutes } = await import("./routes/staff");
  const { default: adminRoutes } = await import("./routes/admin");
  const { default: applicationsRoutes } = await import("./routes/applications");
  const { default: lenderRoutes } = await import("./routes/lender");
  const { default: clientRoutes } = await import("./routes/client");
  const { default: reportingRoutes } = await import("./routes/reporting");
  const { default: reportsRoutes } = await import("./routes/reports");

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

  /* -------------------- SPA/STATIC (NON-API ONLY) -------------------- */
  const staticDir = path.join(process.cwd(), "public");
  const spaIndex = path.join(staticDir, "index.html");
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
  }
  app.get("*", (_req, res, next) => {
    if (!fs.existsSync(spaIndex)) {
      next();
      return;
    }
    res.sendFile(spaIndex);
  });

  /* -------------------- GLOBAL 404 (NON-API ONLY) -------------------- */
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.listen(PORT, () => {
    console.log(`Staff Server running on port ${PORT}`);
  });
}

if (require.main === module) {
  void startServer();
}
