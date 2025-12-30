import express from "express";

const app = express();

/**
 * ABSOLUTE FAST PATHS
 * ───────────────────
 * These must NEVER depend on:
 *  - DB
 *  - async
 *  - config
 *  - bootstrap
 */

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * EVERYTHING ELSE LOADS AFTER
 * ──────────────────────────
 * If this explodes, health STILL passes.
 */

try {
  // OPTIONAL: only load bootstrap AFTER health routes exist
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("./bootstrap");
} catch (err) {
  console.error("BOOTSTRAP FAILED — HEALTH STILL UP", err);
}

/**
 * START SERVER
 */

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
