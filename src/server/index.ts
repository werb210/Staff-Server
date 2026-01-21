// src/server/index.ts

import { buildApp } from "../app";
import otpRouter from "../routes/auth/otp";
import { assertEnv } from "../config";
import { logError, logWarn } from "../observability/logger";
import { notFoundHandler } from "../middleware/errors";
import { markReady } from "../startupState";

let processHandlersInstalled = false;
let server: ReturnType<ReturnType<typeof buildApp>["listen"]> | null = null;

// IMPORTANT:
// buildApp() ALREADY registers API routes internally.
// DO NOT register them again here.
export const app = buildApp();

app.use("/auth/otp", otpRouter);
app.use(notFoundHandler);

const isProd = process.env.NODE_ENV === "production";
if (isProd && !process.env.BASE_URL) {
  throw new Error("BASE_URL must be set in production.");
}

function installProcessHandlers(): void {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;

  process.on("unhandledRejection", (err) => {
    logError("unhandled_rejection", { err });
  });

  process.on("uncaughtException", (err) => {
    logError("uncaught_exception", { err });
  });
}

function resolvePort(): number {
  const rawPort = process.env.PORT;
  if (!rawPort) {
    logWarn("port_missing_defaulting", { fallback: 3000 });
    return 3000;
  }
  const port = Number(rawPort);
  if (Number.isNaN(port)) {
    logWarn("port_invalid_defaulting", { value: rawPort, fallback: 3000 });
    return 3000;
  }
  return port;
}

export async function startServer() {
  installProcessHandlers();
  assertEnv();

  const port = resolvePort();
  server = await new Promise((resolve) => {
    const listener = app.listen(port, "0.0.0.0", () => {
      if (typeof app.set === "function") {
        app.set("port", port);
        app.set("server", listener);
      }
      if (process.env.NODE_ENV !== "test") {
        console.log(`API server listening on ${port}`);
      }
      resolve(listener);
    });
  });

  if (!server) throw new Error("Server failed to start.");

  markReady();
  return server;
}

if (require.main === module && process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    logError("server_start_failed", { err });
  });
}

export { server };
