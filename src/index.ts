import express from "express";
import http from "http";

const app = express();

/**
 * REQUIRED FOR AZURE
 */
const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

/**
 * BASIC MIDDLEWARE
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * HEALTH CHECK — REQUIRED
 * Azure expects HTTP 200
 */
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * ROOT (OPTIONAL BUT SAFE)
 */
app.get("/", (_req, res) => {
  res.status(200).send("Staff Server running");
});

/**
 * START SERVER
 */
const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});

/**
 * FAIL FAST ON CRASH
 */
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION", err);
  process.exit(1);
});
