import express from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import debugRouter from "./routes/debug.routes";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * Azure liveness probe
 * MUST return 200 immediately, always
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Real readiness (for humans only)
 */
app.get("/api/_int/ready", async (_req, res) => {
  try {
    // lazy import so it does NOT block startup
    const { pool } = await import("./db");
    await pool.query("select 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api/auth", authRouter);
app.use("/_debug", debugRouter);

/**
 * JSON-only 404
 */
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "not_found",
    path: req.path,
  });
});

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
