console.log("BOOT START");

import type { Request, Response } from "express";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED", err);
});

console.log("LOADING ENV...");
const { validateRuntimeEnvOrExit } = require("./config/env");

console.log("LOADING APP...");
const loadedApp = require("./app");
const app = loadedApp.default || loadedApp;

const { initDb } = require("./db/init");
const Redis = require("ioredis");

console.log("STARTING SERVER...");

let isReady = false;

// health endpoints
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.get("/ready", (_req: Request, res: Response) => {
  if (isReady) return res.status(200).send("ready");
  return res.status(503).send("not ready");
});

function runStartupSelfTest() {
  try {
    require("./routes");
    require("./routes/auth");
    require("./config/env");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Startup self-test failed: ${message}`);
  }
}

validateRuntimeEnvOrExit();
runStartupSelfTest();

const port = Number(process.env.PORT) || 8080;

// 🚨 START SERVER IMMEDIATELY
app.listen(port, "0.0.0.0", () => {
  console.log(`SERVER STARTED ON ${port}`);
});

// 🚨 THEN initialize dependencies (non-blocking)
void (async () => {
  if (process.env.SKIP_DATABASE === "true") {
    console.log("DB SKIPPED");
  } else {
    try {
      await initDb();
      console.log("DB CONNECTED");
    } catch (err) {
      console.error("DB FAILED:", err);
    }
  }

  try {
    if (process.env.REDIS_URL) {
      const redis = new Redis(process.env.REDIS_URL);
      console.log("REDIS CONNECTED");
      void redis;
    } else {
      console.log("REDIS SKIPPED");
    }
  } catch (err) {
    console.error("REDIS FAILED:", err);
  }

  isReady = true;
})();
