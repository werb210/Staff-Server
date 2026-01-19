import { buildApp, registerApiRoutes } from "../app";
import { assertEnv } from "../config";
import { logError, logWarn } from "../observability/logger";
import { markReady } from "../startupState";

let processHandlersInstalled = false;
let server: ReturnType<ReturnType<typeof buildApp>["listen"]> | null = null;

const isProd = process.env.NODE_ENV === "production";
if (isProd && !process.env.BASE_URL) {
  throw new Error("BASE_URL must be set in production.");
}

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

export async function startServer(): Promise<
  ReturnType<ReturnType<typeof buildApp>["listen"]>
> {
  installProcessHandlers();
  assertEnv();
  const app = buildApp();
  registerApiRoutes(app);

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

  if (!server) {
    throw new Error("Server failed to start.");
  }
  markReady();
  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    logError("server_start_failed", { err });
  });
}

export { server };
