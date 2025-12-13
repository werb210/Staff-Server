import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import healthRouter from "./routes/internal/health";
import dbHealthRouter from "./routes/internal/db";

// create app
const app = express();

// basic hard requirements
app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// INTERNAL ROUTES (NO AUTH)
app.use("/api/internal/health", healthRouter);
app.use("/api/internal/db", dbHealthRouter);

// root (optional but safe)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
