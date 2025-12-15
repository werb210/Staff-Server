import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

// ---- ROUTES (adjust paths only if your repo differs) ----
import authRoutes from "./routes/auth";
import publicRoutes from "./routes/public";
import internalRoutes from "./routes/internal";

// ---- ENV ----
const PORT = process.env.PORT || 8080;

// ---- APP ----
const app = express();

/**
 * ============================
 * CORS — MUST BE FIRST
 * ============================
 * This fixes the Staff Portal login.
 * Browser preflight was being blocked before routes.
 */
const allowedOrigins = new Set(
  (
    process.env.CORS_ORIGINS ??
    "https://staff.boreal.financial,https://staff-portal-azesc6enhyh9fncx.canadacentral-01.azurewebsites.net"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // allow curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // <-- THIS is what your browser needed

// ---- MIDDLEWARE ----
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- ROUTES (AFTER CORS) ----
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/internal", internalRoutes);

// ---- FALLBACKS ----
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---- SERVER ----
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Staff-Server listening on port ${PORT}`);
});

export default app;
