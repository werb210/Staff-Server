import express from "express";
import cors from "cors";

import healthRouter from "./routes/internal/health";
import dbHealthRouter from "./routes/internal/db";

const app = express();

// middleware already supported by repo
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// internal routes (no auth)
app.use("/api/internal/health", healthRouter);
app.use("/api/internal/db", dbHealthRouter);

// root
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
