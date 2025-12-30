import express from "express";

const app = express();

/**
 * ABSOLUTE FAST PATHS
 * - No DB
 * - No async
 * - No middleware
 * - No dependencies
 */

app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("ok");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ alive: true });
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * HARD FAIL-SAFE
 * If anything else hits the server, still respond fast
 */
app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

/**
 * START SERVER — NOTHING BEFORE THIS
 */
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
