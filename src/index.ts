import express from "express";
import http from "http";

const app = express();

/**
 * ============================================================
 * GUARANTEED FAST PATHS (NO DB, NO ASYNC, NO MIDDLEWARE)
 * ============================================================
 * These MUST be first. Azure Health Check depends on it.
 */

// Root (Azure warmup, browser checks)
app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

// Public health
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Azure internal health probe
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * ============================================================
 * NORMAL APP STARTS BELOW
 * ============================================================
 */

// DO NOT block health routes with JSON/body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---- import the rest of your app AFTER health ----
// Example:
// import { registerApi } from "./api";
// registerApi(app);

// Catch-all (never intercept health)
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
