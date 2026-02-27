let trackException: ((err: unknown) => void) | null = null;

if (process.env.NODE_ENV !== "test") {
  try {
    // Lazy load only in non-test
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appInsights = require("./appInsights") as {
      trackException?: (err: unknown) => void;
    };
    trackException = appInsights?.trackException ?? null;
  } catch {
    trackException = null;
  }
}

export function registerProcessHandlers(): void {
  if (process.env.NODE_ENV === "test") return;

  process.on("unhandledRejection", (err) => {
    if (trackException) trackException(err);
  });

  process.on("uncaughtException", (err) => {
    if (trackException) trackException(err);
  });
}

export const installProcessHandlers = registerProcessHandlers;
