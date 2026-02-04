import type { Express } from "express";
import { createServer } from "../../server/createServer";

export async function createTestApp(): Promise<Express> {
  return createServer({
    config: {
      skipEnvCheck: true,
      skipWarmup: true,
      skipSchemaCheck: true,
      skipSeed: true,
      skipCorsCheck: true,
      skipServicesInit: true,
      startFollowUpJobs: false,
    },
  });
}
