import type express from "express";
import { buildApp } from "../app";
import { assertEnv } from "../config";
import { warmUpDatabase } from "../db";
import { assertRequiredSchema } from "../db/schemaAssert";
import { logError } from "../observability/logger";
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
  const app = await buildApp();
  app.set("trust proxy", 1);

  const config = options.config ?? {};
  const db = {
    warmUpDatabase,
    assertRequiredSchema,
    ...options.db,
  };
  const services = {
    initializePushService,
    seedRequirementsForAllProducts,
    startFollowUpJobs,
    ...options.services,
  };

  if (!config.skipEnvCheck) {
    assertEnv();
  }

  if (!config.skipServicesInit) {
    services.initializePushService?.();
  }

  if (!config.skipWarmup) {
    await db.warmUpDatabase?.();
  }

  if (!config.skipSchemaCheck) {
    try {
      await db.assertRequiredSchema?.();
    } catch (err) {
      logError("fatal_schema_mismatch", {
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  if (!config.skipSeed) {
    await services.seedRequirementsForAllProducts?.();
  }


  if (config.startFollowUpJobs !== false) {
    services.startFollowUpJobs?.();
  }

  return app;
}
