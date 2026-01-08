import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

import apiRouter from "./api"; // <-- your existing API router

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --------------------
// Core middleware
// --------------------
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --------------------
// Health (must be JSON)
// --------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// --------------------
// API ROUTES (FIRST)
// --------------------
app.use("/api", apiRouter);

// --------------------
// API 404 GUARD (JSON ONLY)
// --------------------
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// --------------------
// SPA STATIC (LAST)
// --------------------
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// --------------------
// BOOT
// --------------------
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});

export default app;
