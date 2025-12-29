import express from "express";
import http from "http";

const app = express();

/**
 * HEALTH CHECK — MUST BE FIRST
 * Azure probes this endpoint
 */
app.get("/health", (_req, res) => {
  console.log("Health check OK");
  res.status(200).send("OK");
});

/**
 * BASIC MIDDLEWARE
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * EXISTING ROUTES GO BELOW
 * (leave everything else unchanged)
 */

/**
 * SERVER START
 */
const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
