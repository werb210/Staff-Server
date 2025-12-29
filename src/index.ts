import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";

/* ============================
   Environment
============================ */
const PORT = Number(process.env.PORT || 8080);
const NODE_ENV = process.env.NODE_ENV || "production";

/* ============================
   App
============================ */
const app = express();

/* ============================
   CORS — EXPLICIT, FINAL
============================ */
app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://portal.boreal.financial",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ============================
   INT / HEALTH ROUTES
============================ */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "boreal-staff-server",
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/_int/build", (_req, res) => {
  res.status(200).json({
    commit: process.env.GITHUB_SHA || "unknown",
    buildTime: process.env.BUILD_TIME || "unknown",
  });
});

/* ============================
   AUTH ROUTES
============================ */
import authRouter from "./routes/auth.routes";
app.use("/api/auth", authRouter);

/* ============================
   FALLBACKS
============================ */
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ============================
   BOOT
============================ */
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Staff-Server listening on port ${PORT}`);
  console.log(`Health: https://api.staff.boreal.financial/api/_int/health`);
});
