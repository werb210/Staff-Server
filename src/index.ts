import express from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import debugRouter from "./routes/debug.routes";

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
 * Health
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * App Routes
 */
app.use("/api/auth", authRouter);
app.use("/__debug", debugRouter);

/**
 * Capture Express routing table for debug
 */
(global as any).__express_stack__ = app._router.stack;

/**
 * Start server
 */
const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
