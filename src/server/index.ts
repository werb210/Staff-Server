import { buildApp, initializeServer, registerApiRoutes } from "../app";
import { runMigrations } from "../migrations";
import { logError } from "../observability/logger";

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
  if (process.env.PORT === undefined) {
    throw new Error("PORT env var missing");
  }
  const port = Number(process.env.PORT);
  if (Number.isNaN(port)) {
    throw new Error("PORT env var missing");
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

export function startServer(): ReturnType<ReturnType<typeof buildApp>["listen"]> {
  installProcessHandlers();

  const app = buildApp();
  registerApiRoutes(app);

  const port = resolvePort();
  server = app.listen(port, "0.0.0.0", () => {
    if (typeof app.set === "function") {
      const address = typeof server?.address === "function" ? server.address() : null;
      if (address && typeof address === "object" && "port" in address) {
        app.set("port", address.port);
      } else {
        app.set("port", port);
      }
    }
    if (process.env.NODE_ENV !== "test") {
      console.log(`API server listening on ${port}`);
    }
  });

  if (typeof app.set === "function") {
    app.set("server", server);
  }

  if (typeof initializeServer === "function") {
    initializeServer().catch((err) => {
      logError("server_initialize_failed", { err });
    });
  }

  if (process.env.NODE_ENV !== "test") {
    bootstrapMigrations().catch((err) => {
      logError("server_bootstrap_failed", { err });
    });
  }

  return server;
}

if (require.main === module) {
  startServer();
}

export { server };
