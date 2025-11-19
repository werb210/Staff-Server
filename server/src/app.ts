// server/src/app.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// IMPORTANT:
// All route imports MUST use .js in the emitted CJS build.
// Your build already emits these filenames, so this matches dist output.
import applicationsRoutes from "./routes/applications.routes.js";
import ocrRoutes from "./routes/ocr.routes.js";
import searchRoutes from "./routes/search.routes.js";
import tagsRoutes from "./routes/tags.routes.js";

export const app = express();

// Global middleware
app.use(cors());
app.use(bodyParser.json());

// ROUTES
app.use("/api/applications", applicationsRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/tags", tagsRoutes);

// ROOT HEALTH CHECK — Azure warmup friendly
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "staff-server",
    dbReady: Boolean(app.locals.dbReady),
    uptime: process.uptime(),
  });
});
