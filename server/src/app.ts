import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import apiRouter from "./api";
import internalRouter from "./api/internal.routes";

import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(requestLogger);

// --- BASIC ROUTES (for Azure / sanity checks) ---
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// --- INTERNAL HEALTH ROUTES (NO AUTH) ---
app.use("/api/internal", internalRouter);

// --- ALL OTHER ROUTES ---
app.use("/api", apiRouter);

// --- ERROR HANDLER ---
app.use(errorHandler);

export default app;
