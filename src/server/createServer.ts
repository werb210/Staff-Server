import type express from "express";
import type { NextFunction, Request, Response } from "express";
import { assertCorsConfig, buildApp, registerApiRoutes } from "../app";
import { assertEnv } from "../config";
import { warmUpDatabase } from "../db";
import { assertRequiredSchema } from "../db/schemaAssert";
import { logError } from "../observability/logger";
import { getTwilioClient, getVerifyServiceSid } from "../services/twilio";
import { seedRequirementsForAllProducts } from "../services/lenderProductRequirementsService";
import { initializePushService } from "../services/pushService";
import { startFollowUpJobs } from "../modules/followup/followup.scheduler";

export type CreateServerOptions = {
  config?: {
    skipEnvCheck?: boolean;
    skipWarmup?: boolean;
    skipSchemaCheck?: boolean;
    skipSeed?: boolean;
    skipCorsCheck?: boolean;
    skipServicesInit?: boolean;
    startFollowUpJobs?: boolean;
  };
  db?: {
    warmUpDatabase?: () => Promise<void>;
    assertRequiredSchema?: () => Promise<void>;
  };
  services?: {
    initializePushService?: () => void;
    getTwilioClient?: () => void;
    getVerifyServiceSid?: () => void;
    seedRequirementsForAllProducts?: () => Promise<void>;
    startFollowUpJobs?: () => void;
  };
};

export async function createServer(
  options: CreateServerOptions = {}
): Promise<express.Express> {
  const app = buildApp();
  app.set("trust proxy", true);

  const config = options.config ?? {};
  const db = {
    warmUpDatabase,
    assertRequiredSchema,
    ...options.db,
  };
  const services = {
    initializePushService,
    getTwilioClient,
    getVerifyServiceSid,
    seedRequirementsForAllProducts,
    startFollowUpJobs,
    ...options.services,
  };
  const isProduction = (process.env.NODE_ENV ?? "development") === "production";
  const isTestMode = process.env.TEST_MODE === "true";

  if (!config.skipEnvCheck) {
    assertEnv();
  }

  if (!config.skipServicesInit && !isTestMode) {
    services.initializePushService?.();
    services.getTwilioClient?.();
    services.getVerifyServiceSid?.();
  }

  if (!config.skipWarmup) {
    try {
      await db.warmUpDatabase?.();
    } catch (err) {
      if (isProduction) {
        throw err;
      }
      logError("database_warmup_skipped_non_prod", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!config.skipSchemaCheck) {
    try {
      await db.assertRequiredSchema?.();
    } catch (err) {
      if (isProduction) {
        logError("fatal_schema_mismatch", {
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
      logError("schema_check_skipped_non_prod", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!config.skipSeed) {
    try {
      await services.seedRequirementsForAllProducts?.();
    } catch (err) {
      if (isProduction) {
        throw err;
      }
      logError("seed_skipped_non_prod", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!config.skipCorsCheck) {
    try {
      assertCorsConfig();
    } catch (err) {
      logError("fatal_cors_assert", {
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  registerApiRoutes(app);

  if (!isTestMode && config.startFollowUpJobs !== false) {
    services.startFollowUpJobs?.();
  }

  // ===============================
  // JSON 404 handler (MUST BE LAST ROUTE)
  // ===============================
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found",
      path: req.originalUrl,
      method: req.method,
    });
  });

  // ===============================
  // Global error handler (MUST BE LAST MIDDLEWARE)
  // ===============================
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);

    res.status(err?.status || 500).json({
      error: err?.message || "Internal Server Error",
    });
  });

  return app;
}
