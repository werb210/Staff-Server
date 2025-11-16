// server/src/index.ts

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";

import env from "./utils/env.js";
import { registry } from "./db/registry.js";
import apiRouter from "./routes/index.js";

// ------------------------------------------------------------------
// FIX: __dirname for ESM
// ------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------------
// APP INIT
// ------------------------------------------------------------------
const app = express();
const PORT = env.PORT || 5000;

// ------------------------------------------------------------------
// CORS — PRODUCTION SAFE
// ------------------------------------------------------------------
//
// Azure App Service requires explicit origin settings.
// Replace with your true production UI domain.
//
const PROD_ORIGIN = "https://staff.boreal.financial";

app.use(
  cors({
    origin: PROD_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ------------------------------------------------------------------
// BODY PARSERS
// ------------------------------------------------------------------
app.use(bodyParser.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ------------------------------------------------------------------
// INTERNAL HEALTH ENDPOINTS
// ------------------------------------------------------------------
app.get("/api/_int/health", (_, res) => {
  res.status(200).json({ ok: true, ts: Date.now() });
});

app.get("/api/_int/build", (_, res) => {
  res.status(200).json({ ok: true, source: "build-check" });
});

app.get("/api/_int/db", async (_, res) => {
  try {
    const now = await registry.system.query("SELECT NOW()");
    res.status(200).json({ ok: true, dbTime: now.rows[0] });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DEBUG: list all registered routes
app.get("/api/_int/routes", (_, res) => {
  const routes: any[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(middleware.route.path);
    } else if (middleware.name === "router" && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) routes.push(handler.route.path);
      });
    }
  });

  res.status(200).json({ ok: true, routes });
});

// ------------------------------------------------------------------
// MAIN API ROUTER
// ------------------------------------------------------------------
app.use("/api", apiRouter);

// ------------------------------------------------------------------
// ROOT
// ------------------------------------------------------------------
app.get("/", (_, res) => {
  res.status(200).send("Boreal Staff API is running");
});

// ------------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Staff API running on port ${PORT}`);
});

export default app;
