// server/src/app.ts
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import applicationsRoutes from "./routes/applications.routes.js";

export const app = express();

app.use(cors());
app.use(bodyParser.json());

// ROUTES
app.use("/api/applications", applicationsRoutes);

// ROOT HEALTH CHECK
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "staff-server" });
});
