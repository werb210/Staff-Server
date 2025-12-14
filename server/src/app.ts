import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { healthRouter } from "./routes/internal/health";
import { dbRouter } from "./routes/internal/db";

import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

/**
 * INTERNAL – NO AUTH
 * These must stay PUBLIC or Azure health checks break
 */
app.use("/api/_int/health", healthRouter);
app.use("/api/_int/db", dbRouter);

/**
 * Error handler must be last
 */
app.use(errorHandler);

export default app;
