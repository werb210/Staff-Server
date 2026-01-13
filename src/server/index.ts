import express from "express";
import path from "path";
import { registerApiRoutes } from "./routes";

const app = express();

/* =========================
   API ROUTES — FIRST
========================= */
registerApiRoutes(app);

/* Health endpoint (JSON only) */
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/* =========================
   STATIC FILES
========================= */
const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));

/* =========================
   SPA FALLBACK — LAST
   NEVER intercept /api/*
========================= */
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API route not found" });
    return;
  }
  res.sendFile(path.join(distPath, "index.html"));
});

/* =========================
   START SERVER
========================= */
const port = Number(process.env.PORT);
if (!port) throw new Error("PORT env var missing");

app.listen(port, "0.0.0.0", () => {
  console.log(`API server listening on ${port}`);
});
