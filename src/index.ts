import express from "express";
import http from "http";

const app = express();

// ─────────────────────────────────────────────────────────────
// GUARANTEED FAST ROUTES (NO DB, NO ASYNC)
// ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ─────────────────────────────────────────────────────────────
// SERVER BOOT
// ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 8080);

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
