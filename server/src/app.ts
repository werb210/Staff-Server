import express from "express";
import cors from "cors";

// IMPORTANT:
// app.ts must ONLY contain app wiring.
// No server.listen here.

const app = express();

/**
 * ─────────────────────────────────────────────
 * Global middleware
 * ─────────────────────────────────────────────
 */
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ─────────────────────────────────────────────
 * PUBLIC HEALTH ROUTES (NO AUTH, NO API PREFIX)
 * ─────────────────────────────────────────────
 * These MUST exist so:
 * - Azure health probes work
 * - curl sanity checks work
 * - we can debug prod without auth
 */

// Basic health (used by humans + probes)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Azure / platform-friendly alt
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * ─────────────────────────────────────────────
 * ROOT
 * ─────────────────────────────────────────────
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * ─────────────────────────────────────────────
 * FALLBACK (MUST BE LAST)
 * ─────────────────────────────────────────────
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
