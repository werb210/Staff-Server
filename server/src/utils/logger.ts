export function logInfo(message: string): void {
  console.log("[logger] logInfo invoked");
  console.info(`[INFO] ${message}`);
}

export function logWarn(message: string): void {
  console.log("[logger] logWarn invoked");
  console.warn(`[WARN] ${message}`);
}

export function logError(message: string, error?: unknown): void {
  console.log("[logger] logError invoked");
  if (error instanceof Error) {
    console.error(`[ERROR] ${message}: ${error.message}`);
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

export function logDebug(message: string, payload?: unknown): void {
  console.log("[logger] logDebug invoked");
  if (payload !== undefined) {
    console.debug(`[DEBUG] ${message}`, payload);
  } else {
    console.debug(`[DEBUG] ${message}`);
  }
}
