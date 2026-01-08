import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";

import apiRouter from "./api";
import { printRoutes } from "./debug/printRoutes";

const app = express();

// --------------------
// Core middleware
// --------------------
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
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
// SPA STATIC (LAST)
// --------------------
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

printRoutes(app);

// --------------------
// BOOT
// --------------------
const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});

export default app;
