// src/index.ts — COMPLETE FILE
import express from "express";
import http from "http";

const app = express();

// ---- basic middleware ----
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ---- health check (Azure) ----
// MUST be fast, unauthenticated, and always 200 when process is alive.
app.get("/health", (_req, res) => {
  // Visible in Log Stream so you can prove probes are hitting you.
  console.log(`[health] 200 OK ${new Date().toISOString()}`);
  res.status(200).type("text/plain").send("OK");
});

// Optional: common internal health alias (handy if you switch probe path later)
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

// ---- root ----
app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("Staff-Server is running");
});

// ---- keep the process from dying silently ----
process.on("unhandledRejection", (err) => {
  console.error("[fatal] unhandledRejection", err);
});
process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException", err);
});

// ---- listen ----
// Azure injects PORT. If not present, Azure startup script sets 8080.
const portRaw = process.env.PORT;
const port = portRaw ? Number(portRaw) : 8080;

const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});
