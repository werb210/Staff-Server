import express from "express";
import cors from "cors";

import apiRouter from "./api";
import { printRoutes } from "./debug/printRoutes";

const app = express();

// --------------------
// Core middleware
// --------------------
app.use(
  cors({
    origin: true,
    credentials: false,
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposedHeaders: ["x-request-id"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------
// Health (must be JSON)
// --------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// --------------------
// API ROUTES (FIRST)
// --------------------
app.use("/api", apiRouter);

printRoutes(app);

// --------------------
// BOOT
// --------------------
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});

export default app;
