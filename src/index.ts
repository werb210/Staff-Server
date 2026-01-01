// src/index.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import debugRouter from "./routes/debug.routes";

const app = express();

/**
 * Hard stop: never crash silently.
 */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

/**
 * Middleware
 */
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));

/**
 * Root (200 JSON)
 */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "staff-server" });
});

/**
 * Lightweight health (process alive only)
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

/**
 * Internal health (same semantics as above, stable for Azure health probe)
 */
app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

/**
 * Debug routes list
 */
app.use("/_debug", debugRouter);

/**
 * Auth
 */
app.use("/api/auth", authRouter);

/**
 * 404 JSON (so curl|jq never breaks with HTML)
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: "not_found", path: req.path });
});

/**
 * Error JSON
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("REQUEST_ERROR", err);
  res.status(500).json({ ok: false, error: "internal_error" });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
