import { config } from "../config";
import { dbClient } from "../infra/dbClient";
import { redisClient } from "../infra/redisClient";
import { initializeAppInsights } from "../observability/appInsights";
import { initializeSentry } from "../observability/sentry";

export async function bootstrapStartup(): Promise<void> {
  void config;

  await dbClient.query("select 1");
  await redisClient.ping();
  initializeAppInsights();
  initializeSentry();
}
