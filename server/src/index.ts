// server/src/index.ts
import "dotenv/config";
import express from "express";
import { app } from "./app.js";
import prisma from "./db/index.js";

// Normalize PORT for Azure
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// Azure does NOT allow ESM imports inside emitted CJS without .js extension.
// Your build already outputs correct .js files in dist/, so this works.

// Remove special database flags — keep simple + stable
const SHOULD_FAIL_ON_DB_ERROR = process.env.REQUIRE_DATABASE === "true";

async function start() {
  // Default: database NOT ready
  app.locals.dbReady = false;

  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Database connected.");
    app.locals.dbReady = true;
  } catch (err: any) {
    console.error("Database connection failed:", err.message || err);

    if (SHOULD_FAIL_ON_DB_ERROR) {
      console.error("REQUIRE_DATABASE=true → exiting.");
      process.exit(1);
      return;
    }

    // Continue without DB
    console.warn("Continuing startup without database.");
    app.locals.dbReady = false;
  }

  app.listen(PORT, () => {
    console.log(`🚀 Staff Server running on port ${PORT}`);
  });
}

start();
