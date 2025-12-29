import express from "express";
import http from "http";

const app = express();

/* =========================
   BASIC MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   HEALTH CHECK (AZURE)
   - Must be fast
   - Must return 200
   - Must log so we SEE it
========================= */
app.get("/health", (_req, res) => {
  console.log("[HEALTH] probe OK");
  res.status(200).send("OK");
});

/* =========================
   ROOT (OPTIONAL VISIBILITY)
========================= */
app.get("/", (_req, res) => {
  res.status(200).send("Staff-Server alive");
});

/* =========================
   SERVER BOOT
========================= */
const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});

/* =========================
   SAFETY LOGGING
========================= */
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});
