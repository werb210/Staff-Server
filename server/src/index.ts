// server/src/index.ts

import "dotenv/config";
import express from "express";
import { app } from "./app.js";
import prisma, { prismaInitError, prismaIsAvailable } from "./db/index.js";

// Azure gives PORT automatically → always respect it
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// If REQUIRE_DATABASE=true → crash on DB error
const REQUIRE_DB = process.env.REQUIRE_DATABASE === "true";

async function start() {
  app.locals.dbReady = false;

  if (!prismaIsAvailable) {
    if (prismaInitError) {
      console.error("Prisma initialization failed:", prismaInitError.message);
    } else {
      console.warn("Prisma client unavailable; skipping DB connection.");
    }

    if (REQUIRE_DB) {
      console.error("REQUIRE_DATABASE=true — exiting.");
      process.exit(1);
      return;
    }

    console.warn("Starting server WITHOUT database.");
  } else {
    try {
      console.log("Connecting to database...");
      await prisma.$connect();
      console.log("Database connected.");
      app.locals.dbReady = true;
    } catch (err: any) {
      console.error("Database connection failed:", err?.message || err);

      if (REQUIRE_DB) {
        console.error("REQUIRE_DATABASE=true — exiting.");
        process.exit(1);
        return;
      }

      console.warn("Starting server WITHOUT database.");
      app.locals.dbReady = false;
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Staff Server running on port ${PORT}`);
  });
}

start();
