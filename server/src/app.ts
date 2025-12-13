import express from "express";
import cors from "cors";

const app = express();

/**
 * ============================================================
 * PUBLIC, UNAUTHENTICATED LIVENESS ROUTES
 * ============================================================
 * These MUST exist outside auth, DB, config, or feature flags.
 * Azure, load balancers, and humans depend on these.
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * ============================================================
 * GLOBAL MIDDLEWARE
 * ============================================================
 */
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ============================================================
 * ROOT (OPTIONAL BUT USEFUL)
 * ============================================================
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * ============================================================
 * FALLBACK
 * ============================================================
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
