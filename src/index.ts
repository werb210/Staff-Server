import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import { checkDb } from "./db";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * ROOT — must always respond instantly
 */
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * LIVENESS — process only
 */
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({ alive: true });
});

/**
 * READINESS — DB checked ONLY here
 */
app.get("/api/_int/ready", async (_req, res) => {
  try {
    await checkDb();
    res.status(200).json({ ready: true });
  } catch (err: any) {
    res.status(500).json({
      ready: false,
      error: err?.message ?? "db failed",
    });
  }
});

app.use("/api/auth", authRoutes);

const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
