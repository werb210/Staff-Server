// src/server/index.ts

import type { Express } from "express";
import type { Server } from "http";
import { validateServerEnv } from "./config/env";
import { ENV, validateEnv } from "../config/env";
import { logger } from "../lib/logger";
import { markReady } from "../startupState";
import { createServer } from "./createServer";
import { db } from "../db";
import { initChatSocket } from "../modules/ai/socket.server";

let processHandlersInstalled = false;
let server: Server | null = null;
let app: Express | null = null;

function installProcessHandlers(): void {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;

  process.on("unhandledRejection", (err) => {
    logger.fatal({ reason: err }, "Unhandled Promise Rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ error: err }, "Uncaught Exception");
    process.exit(1);
  });
}

async function verifyDatabase() {
  try {
    await db.query("SELECT 1");
    logger.info("database_connected");
  } catch (_err) {
    logger.error("database_connection_failed");
    process.exit(1);
  }
}


export async function startServer() {
  installProcessHandlers();
  if (process.env.NODE_ENV === "production") {
    validateEnv();
  }
  validateServerEnv();
  if (process.env.NODE_ENV === "production") {
    await verifyDatabase();
  }
  app = await createServer();

  const port = ENV.PORT;
  server = await new Promise((resolve) => {
    if (!app) {
      throw new Error("Server failed to initialize.");
    }
    const listener = app.listen(port, "0.0.0.0", () => {
      if (typeof app?.set === "function") {
        app.set("port", port);
        app.set("server", listener);
      }
      logger.info({ port }, "server_listening");
      resolve(listener);
    });
  });

  if (!server) throw new Error("Server failed to start.");

  initChatSocket(server);
  markReady();
  return server;
}

process.on("SIGTERM", async () => {
  logger.info("server_shutting_down");
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  process.exit(0);
});

if (require.main === module && process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logger.fatal({ err }, "server_start_failed");
    process.exit(1);
  });
}

export { server };
