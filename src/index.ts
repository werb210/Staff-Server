import express from "express";
import type { Request, Response, NextFunction } from "express";
import authRouter from "./routes/auth";
import { pool } from "./db";

const app = express();

// ---- middleware
app.use(express.json({ limit: "2mb" }));

// ---- root
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "staff-server" });
});

// ---- internal health (process alive only)
app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// ---- internal ready (db reachable)
app.get("/api/_int/ready", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("READY_DB_ERROR", err);
    res.status(503).json({ ok: false, error: "db_unavailable" });
  }
});

// ---- routes
app.use("/api/auth", authRouter);

// ---- global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("UNHANDLED_ERROR", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_error" });
});

// ---- STARTUP: bind port FIRST (do not block)
const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);

  // Warm DB in background (DO NOT await)
  setTimeout(async () => {
    try {
      await pool.query("SELECT 1");
      console.log("DB warm OK");
    } catch (e) {
      console.error("DB warm FAILED", e);
    }
  }, 0);
});
