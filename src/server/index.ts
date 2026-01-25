// src/server/index.ts

import { buildApp, registerApiRoutes } from "../app";
import { assertEnv } from "../config";
import { warmUpDatabase } from "../db";
import { assertRequiredSchema } from "../db/schemaAssert";
import { logError, logWarn } from "../observability/logger";
import { notFoundHandler } from "../middleware/errors";
import { markReady } from "../startupState";
import { getTwilioClient, getVerifyServiceSid } from "../services/twilio";
import { seedRequirementsForAllProducts } from "../services/lenderProductRequirementsService";

let processHandlersInstalled = false;
let server: ReturnType<ReturnType<typeof buildApp>["listen"]> | null = null;

// IMPORTANT:
// buildApp() creates the base app; register API routes explicitly here.
export const app = buildApp();

// Ensure Express is aware it may be behind a proxy (Azure/App Service)
app.set("trust proxy", true);

const isProd = process.env.NODE_ENV === "production";
if (isProd && !process.env.BASE_URL) {
  throw new Error("BASE_URL must be set in production.");
}

if (process.env.NODE_ENV === "test") {
  registerApiRoutes(app);
  app.use(notFoundHandler);
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
  getTwilioClient();
  getVerifyServiceSid();

  await warmUpDatabase();
  try {
    await assertRequiredSchema();
  } catch (err: any) {
    logError("fatal_schema_mismatch", { message: err?.message ?? String(err) });
    process.exit(1);
  }
  await seedRequirementsForAllProducts();
  console.log(
    "schema_assert: OK (users.lender_id, lenders.id, lenders.country, lenders.submission_method, lender_products.lender_id, lender_products.required_documents)"
  );

  // Register all API routes using the unified registry
  registerApiRoutes(app);

  // Global 404 handler (after all routes)
  app.use(notFoundHandler);

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
