// server/src/app.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import applicationsRoutes from "./routes/applications.routes.js";
import ocrRoutes from "./routes/ocr.routes.js";
import searchRoutes from "./routes/search.routes.js";

export const app = express();

app.use(cors());
app.use(bodyParser.json());

// ROUTES
app.use("/api/applications", applicationsRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/search", searchRoutes);

// ROOT HEALTH CHECK
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "staff-server" });
});
