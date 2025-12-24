import express from "express";
import cors from "cors";

const app = express();

/**
 * BASIC MIDDLEWARE
 */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ROOT ROUTE (prevents Azure idle restart confusion)
 */
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * INTERNAL HEALTH ROUTES
 * (INLINE — no imports, no fake files)
 */
app.get("/_int/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/_int/routes", (_req, res) => {
  const routes = app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => ({
      method: Object.keys(r.route.methods)[0].toUpperCase(),
      path: r.route.path,
    }));

  res.status(200).json(routes);
});

/**
 * API ROUTES (existing codebase only)
 */
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/**
 * START SERVER — Azure-safe
 */
const PORT = Number(process.env.PORT) || 8080;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});

/**
 * PREVENT CRASH-LOOP RESTARTS
 */
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

export default server;
