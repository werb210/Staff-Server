import { buildApp, initializeServer, registerApiRoutes } from "../app";
import { runMigrations } from "../migrations";
import { logError, logWarn } from "../observability/logger";

let processHandlersInstalled = false;
let server: ReturnType<ReturnType<typeof buildApp>["listen"]> | null = null;

function installProcessHandlers(): void {
  if (processHandlersInstalled) {
    return;
  }
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
  if (rawPort === undefined || rawPort === "") {
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

async function bootstrapMigrations(): Promise<void> {
  try {
    await runMigrations();
  } catch (err) {
    logError("migrations_failed_nonfatal", { err });
  }
}

function assertBaseUrlForCi(): void {
  const isCi = process.env.CI === "true" || process.env.CI === "1";
  if (!isCi) {
    return;
  }
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    return;
  }
  if (/localhost|127\.0\.0\.1/i.test(baseUrl)) {
    throw new Error("BASE_URL must not use localhost in CI.");
  }
}

export async function startServer(): Promise<
  ReturnType<ReturnType<typeof buildApp>["listen"]>
> {
  installProcessHandlers();
  assertBaseUrlForCi();

  const app = buildApp();
  registerApiRoutes(app);

  if (typeof initializeServer === "function") {
    try {
      await initializeServer();
    } catch (err) {
      logError("server_initialize_failed", { err });
    }
  }

  const port = resolvePort();
  server = await new Promise((resolve) => {
    const listener = app.listen(port, "0.0.0.0", () => {
      if (typeof app.set === "function") {
        const address =
          typeof listener?.address === "function" ? listener.address() : null;
        if (address && typeof address === "object" && "port" in address) {
          app.set("port", address.port);
        } else {
          app.set("port", port);
        }
      }
      if (process.env.NODE_ENV !== "test") {
        console.log(`API server listening on ${port}`);
      }
      resolve(listener);
    });
    if (typeof app.set === "function") {
      app.set("server", listener);
    }
  });

  if (process.env.NODE_ENV !== "test") {
    bootstrapMigrations().catch((err) => {
      logError("server_bootstrap_failed", { err });
    });
  }

  if (!server) {
    throw new Error("Server failed to start.");
  }
  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    logError("server_start_failed", { err });
  });
}

export { server };
