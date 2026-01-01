import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { mountDebug } from "./routes/debug.routes";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Root
 */
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Internal health — MUST be fast, no dependencies
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Internal readiness — MUST always respond
 */
app.get("/api/_int/ready", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Auth
 */
app.use("/api/auth", authRouter);

/**
 * Debug
 */
mountDebug(app);

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
