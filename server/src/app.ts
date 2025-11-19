// server/src/app.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Route imports – must use .js so the CJS build works in dist/
import applicationsRoutes from "./routes/applications.routes.js";
import ocrRoutes from "./routes/ocr.routes.js";
import searchRoutes from "./routes/search.routes.js";
import tagsRoutes from "./routes/tags.routes.js";
import healthRoutes from "./routes/health.routes.js";

export const app = express();

// Global middleware
app.use(cors());
app.use(bodyParser.json());

// API ROUTES
app.use("/api/applications", applicationsRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/tags", tagsRoutes);

// INTERNAL HEALTH CHECK FOR AZURE
// This is what Azure is calling: /api/_int/health
app.use("/api/_int/health", healthRoutes);

// ROOT HEALTH CHECK (manual, browser, curl)
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "staff-server",
    dbReady: Boolean(app.locals.dbReady),
    uptime: process.uptime(),
  });
});
