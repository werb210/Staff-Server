import express from "express";
import cors from "cors";

import internalRoutes from "./api/internal";

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * PUBLIC ROOT — REQUIRED BY AZURE
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * PUBLIC HEALTH — REQUIRED BY LOAD BALANCERS
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * INTERNAL ROUTES (NOT PUBLIC CONTRACT)
 */
app.use("/api/internal", internalRoutes);

/**
 * FALLBACK
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
