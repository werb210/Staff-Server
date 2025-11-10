/**
 * Logger utility functions for consistent logging across the application.
 */

/**
 * Logs an informational message.
 */
export function logInfo(message: string): void {
  console.log("[logger] logInfo invoked");
  console.info(`[INFO] ${message}`);
}

/**
 * Logs a warning message.
 */
export function logWarn(message: string): void {
  console.log("[logger] logWarn invoked");
  console.warn(`[WARN] ${message}`);
}

/**
 * Logs an error message and optional error object.
 */
export function logError(message: string, error?: unknown): void {
  console.log("[logger] logError invoked");
  if (error instanceof Error) {
    console.error(`[ERROR] ${message}: ${error.message}`);
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Logs a debug message with optional structured payload data.
 */
export function logDebug(message: string, payload?: unknown): void {
  console.log("[logger] logDebug invoked");
  if (payload !== undefined) {
    console.debug(`[DEBUG] ${message}`, payload);
  } else {
    console.debug(`[DEBUG] ${message}`);
  }
}
