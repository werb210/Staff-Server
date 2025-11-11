/**
 * Logger utility functions for consistent logging across the application.
 */

/**
 * Logs an informational message.
 */
export function logInfo(message: string, payload?: unknown): void {
  if (payload !== undefined) {
    console.info(`[INFO] ${message}`, payload);
  } else {
    console.info(`[INFO] ${message}`);
  }
}

/**
 * Logs a warning message.
 */
export function logWarn(message: string, payload?: unknown): void {
  if (payload !== undefined) {
    console.warn(`[WARN] ${message}`, payload);
  } else {
    console.warn(`[WARN] ${message}`);
  }
}

/**
 * Logs an error message and optional error object.
 */
export function logError(message: string, error?: unknown): void {
  if (error instanceof Error) {
    console.error(`[ERROR] ${message}`, error);
  } else if (error !== undefined) {
    console.error(`[ERROR] ${message}`, error);
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Logs a debug message with optional structured payload data.
 */
export function logDebug(message: string, payload?: unknown): void {
  if (payload !== undefined) {
    console.debug(`[DEBUG] ${message}`, payload);
  } else {
    console.debug(`[DEBUG] ${message}`);
  }
}
