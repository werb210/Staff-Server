/* eslint-disable no-console */
import express from "express";
import http from "http";

// ===== FAST BOOT STRAP =====
// Absolutely nothing blocking before listen()

const app = express();

// Instant root
app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

// Instant health (no DB, no async)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Internal health
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Bind immediately
const PORT = Number(process.env.PORT || 8080);
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});

// ===== DEFERRED INIT (NON-BLOCKING) =====
// Everything below happens AFTER bind

setImmediate(async () => {
  try {
    // Lazy imports so they cannot block startup
    const { default: cors } = await import("cors");
    const { default: bodyParser } = await import("body-parser");

    app.use(cors());
    app.use(bodyParser.json({ limit: "10mb" }));
    app.use(bodyParser.urlencoded({ extended: true }));

    // Route mounts (lazy)
    try {
      const routes = await import("./routes");
      app.use("/api", routes.default);
    } catch (e) {
      console.error("ROUTES LOAD FAILED", e);
    }

    // DB / services must NEVER block listen
    try {
      const { initDb } = await import("./services/db");
      initDb().catch(err => console.error("DB INIT FAILED", err));
    } catch (e) {
      console.error("DB MODULE LOAD FAILED", e);
    }

    console.log("BOOTSTRAP COMPLETE");
  } catch (err) {
    console.error("DEFERRED INIT FAILED", err);
  }
});

// ===== HARD FAIL SAFETY =====
process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION", err);
});
process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION", err);
});
