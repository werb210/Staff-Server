import * as appInsights from "applicationinsights";
import { isTestEnvironment } from "../config";
import { logInfo, logWarn } from "./logger";

export function initializeAppInsights(): void {
  try {
    if (isTestEnvironment()) {
      return;
    }

    const connectionString =
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ??
      process.env.APPINSIGHTS_CONNECTION_STRING;

    if (!connectionString?.trim()) {
      logWarn("appinsights_disabled", {
        reason: "missing_connection_string",
      });
      return;
    }

    if (typeof appInsights.setup !== "function") {
      console.warn("appinsights_disabled", {
        reason: "setup_unavailable",
      });
      return;
    }

    appInsights
      .setup(connectionString)
      .setAutoCollectConsole(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectPerformance(true, false)
      .setAutoCollectRequests(true)
      .setSendLiveMetrics(false)
      .start();

    logInfo("appinsights_initialized");
  } catch (error) {
    console.warn("appinsights_disabled", {
      reason: "initialization_failed",
      error,
    });
  }
}
