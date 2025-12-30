import express from "express";
import http from "http";

const app = express();

/* ========= HARD HEALTH ROUTES (FIRST) ========= */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/* ========= SERVER START (NO DB GATING) ========= */
const PORT = process.env.PORT || 8080;

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});

/* ========= EVERYTHING ELSE LOADS AFTER ========= */
(async () => {
  try {
    // import AFTER server is live
    await import("./bootstrap"); // db, routes, auth, middleware
    console.log("BOOTSTRAP COMPLETE");
  } catch (err) {
    console.error("BOOTSTRAP FAILED", err);
  }
})();
