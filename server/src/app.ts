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

/**
 * Root route: Azure and humans hit "/" constantly.
 * Returning 200 prevents "Cannot GET /" confusion and helps smoke testing.
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// --- INTERNAL HEALTH ROUTES (NO AUTH) ---
app.use("/api/internal", internalRouter);

// --- ALL OTHER ROUTES ---
app.use("/api", apiRouter);

// --- ERROR HANDLER ---
app.use(errorHandler);

export default app;
