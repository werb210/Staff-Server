import appInsights from "applicationinsights";
import {
  getAppInsightsConnectionStringConfig,
  isTestEnvironment,
} from "../config";
import { logInfo } from "./logger";

let initialized = false;

export function initializeAppInsights(): void {
  if (initialized || isTestEnvironment()) {
    return;
  }
  const connectionString = getAppInsightsConnectionStringConfig();
  if (!connectionString) {
    return;
  }

  appInsights
    .setup(connectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectConsole(false)
    .setUseDiskRetryCaching(true)
    .start();

  initialized = true;
  logInfo("app_insights_initialized", {});
}
