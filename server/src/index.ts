import express from "express";
import http from "http";

const app = express();

/**
 * Trust proxy is REQUIRED on Azure App Service
 */
app.set("trust proxy", true);

/**
 * Core middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * HARD-WIRED INTERNAL ROUTES
 * These were missing at runtime — proven by grep + curl.
 * No external route imports. No indirection.
 */
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/_int/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staff-server",
    ts: new Date().toISOString(),
  });
});

app.get("/_int/routes", (_req, res) => {
  const routes: string[] = [];
  app._router.stack.forEach((layer: any) => {
    if (layer.route?.path) {
      routes.push(layer.route.path);
    }
  });
  res.status(200).json({ routes });
});

/**
 * FINAL 404 — must be last
 */
app.use((_req, res) => {
  res.status(404).send("Not Found");
});

/**
 * SERVER BOOT
 * Explicit bind required for Azure
 */
const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});

/**
 * HARD FAIL VISIBILITY
 * Prevent silent restarts
 */
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION", err);
  process.exit(1);
});
