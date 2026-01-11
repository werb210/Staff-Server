import { logError } from "./logger";

let handlersInstalled = false;

export function installProcessHandlers(): void {
  if (handlersInstalled) {
    return;
  }
  handlersInstalled = true;

  process.on("unhandledRejection", (reason) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason));
    logError("unhandled_rejection", { error: error.message });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { trackException } = require("./appInsights") as typeof import("./appInsights");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isDbConnectionFailure } = require("../dbRuntime") as typeof import("../dbRuntime");
    const classification = isDbConnectionFailure(error)
      ? "db_unavailable"
      : "unknown";
    trackException({
      exception: error,
      properties: {
        event: "unhandled_rejection",
        classification,
      },
    });
  });
}
