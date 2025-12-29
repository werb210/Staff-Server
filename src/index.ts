import express from "express";
import http from "http";

const app = express();

/**
 * -------------------------
 * BASIC MIDDLEWARE
 * -------------------------
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * -------------------------
 * HEALTH CHECK (AZURE)
 * -------------------------
 * Azure App Service probes this path
 * Must return 200 quickly
 */
app.get("/health", (_req, res) => {
  console.log("Health check OK");
  res.status(200).send("OK");
});

/**
 * -------------------------
 * ROOT (OPTIONAL BUT USEFUL)
 * -------------------------
 */
app.get("/", (_req, res) => {
  res.status(200).send("Staff Server running");
});

/**
 * -------------------------
 * PORT BINDING (AZURE)
 * -------------------------
 * Azure injects PORT
 * Do NOT hardcode
 */
const port = process.env.PORT
  ? Number(process.env.PORT)
  : 8080;

const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});

/**
 * -------------------------
 * HARD FAIL ON SILENT ERRORS
 * -------------------------
 */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});
