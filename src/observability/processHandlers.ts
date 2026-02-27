import { logError } from "./logger";

let handlersInstalled = false;

function loadAppInsights(): (typeof import("./appInsights"))["trackException"] | null {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { trackException } = require("./appInsights") as typeof import("./appInsights");
    return trackException;
  } catch {
    return null;
  }
}

export function installProcessHandlers(): void {
  if (handlersInstalled) {
    return;
  }
  handlersInstalled = true;

  process.on("unhandledRejection", (reason) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason));
    logError("unhandled_rejection", { error: error.message });
    const trackException = loadAppInsights();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isDbConnectionFailure } = require("../dbRuntime") as typeof import("../dbRuntime");
    const classification = isDbConnectionFailure(error)
      ? "db_unavailable"
      : "unknown";
    if (trackException) {
      trackException({
        exception: error,
        properties: {
          event: "unhandled_rejection",
          classification,
        },
      });
    }
  });
}
