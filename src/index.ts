// src/index.ts
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// =========================
// App bootstrap
// =========================
const app = express();
const server = http.createServer(app);

// =========================
// Middleware (NO auth before health)
// =========================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// =========================
// REQUIRED BY AZURE
// =========================

// Root MUST return 200 (Azure pings "/")
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Azure health probe
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Optional readiness (kept simple, no DB dependency)
app.get("/api/_int/ready", (_req, res) => {
  res.status(200).json({ ok: true });
});

// =========================
// API ROUTES (mount after health)
// =========================

// Example placeholder – replace with real routers if present
// app.use("/api/auth", authRouter);
// app.use("/api/crm", crmRouter);
// app.use("/api/documents", documentsRouter);
// app.use("/api/reporting", reportingRouter);

// =========================
// Error handling
// =========================
app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.use((
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  console.error("unhandled_error", err);
  res.status(500).json({ error: "internal_server_error" });
});

// =========================
// Server start (NO REQUIRED ENV)
// =========================
const PORT = Number(process.env.PORT) || 8080;

server.listen(PORT, () => {
  console.log(`server_started port=${PORT}`);
});

// =========================
// Graceful shutdown
// =========================
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});
