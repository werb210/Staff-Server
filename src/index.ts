// src/index.ts
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import debugRoutes from "./routes/debug.routes";
import { pool } from "./db";

const app = express();

app.use(cors());
app.use(express.json());

// ROOT
app.get("/", (_req, res) => {
  res.json({ ok: true });
});

// INTERNAL HEALTH (process only)
app.get("/api/_int/health", (_req, res) => {
  res.json({ ok: true });
});

// INTERNAL READY (DB check)
app.get("/api/_int/ready", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/_debug", debugRoutes);

// START
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
