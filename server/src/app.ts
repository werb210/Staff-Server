import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import apiRoutes from "./api";
import { pool } from "./db";

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = new Set([
        "https://staff.boreal.financial",
        "http://localhost:5173",
        "http://localhost:3000",
      ]);
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

const healthHandler = async (_req: express.Request, res: express.Response) => {
  try {
    await pool.query("select 1 as ok");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (error: any) {
    res.status(500).json({ status: "error", db: "disconnected", error: String(error?.message ?? error) });
  }
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api", apiRoutes);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export { app };
export default app;
