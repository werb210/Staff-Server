import * as appInsights from "applicationinsights";
import { isTestEnvironment } from "../config";
import { logInfo, logWarn } from "./logger";

export function initializeAppInsights(): void {
  if (isTestEnvironment()) {
    return;
  }

  const connectionString =
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ??
    process.env.APPINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    logWarn("appinsights_disabled", {
      reason: "missing_connection_string",
    });
    return;
  }

  appInsights
    .setup(connectionString)
    .setAutoCollectConsole(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectRequests(true)
    .setSendLiveMetrics(false)
    .start();

  logInfo("appinsights_initialized");
}
