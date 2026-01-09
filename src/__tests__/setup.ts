import { logError } from "../observability/logger";
import { setDbConnected } from "../startupState";

process.env.NODE_ENV = "test";
process.env.RUN_MIGRATIONS = "false";
process.env.DB_READY_ATTEMPTS = "1";
process.env.DB_READY_BASE_DELAY_MS = "1";

setDbConnected(true);

if (!(globalThis as { __unhandledRejectionHandlerInstalled?: boolean })
  .__unhandledRejectionHandlerInstalled) {
  (globalThis as { __unhandledRejectionHandlerInstalled?: boolean })
    .__unhandledRejectionHandlerInstalled = true;
  process.on("unhandledRejection", (reason) => {
    logError("unhandled_rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
}
