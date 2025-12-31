import express from "express";
import http from "http";

import { healthRouter } from "./routes/health";
import { internalRouter } from "./routes/internal";
import { apiRouter } from "./routes/api";

const app = express();

app.use(express.json());

// ROUTES — order matters
app.use(healthRouter);          // /health
app.use(internalRouter);        // /api/_int/*
app.use("/api", apiRouter);     // /api/*

// ----- SERVER BOOTSTRAP (THIS WAS MISSING) -----

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// ----- SAFETY -----
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED_REJECTION", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
  process.exit(1);
});
