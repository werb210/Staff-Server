import { logDebug, logInfo } from "./logger.js";

/**
 * Validates whether a government-issued identifier meets minimum format requirements.
 */
export function validateGovernmentId(id: string): boolean {
  logInfo("validateGovernmentId invoked");
  const isValid = /^[A-Z0-9]{6,}$/i.test(id);
  logDebug("validateGovernmentId result", { id, isValid });
  return isValid;
}

/**
 * Validates that an application identifier matches the APP-XXXXXX convention.
 */
export function validateApplicationId(id: string): boolean {
  logInfo("validateApplicationId invoked");
  const isValid = /^APP-[0-9]{6}$/i.test(id);
  logDebug("validateApplicationId result", { id, isValid });
  return isValid;
}

/**
 * Normalizes identifiers to uppercase trimmed strings for consistent comparisons.
 */
export function normalizeId(id: string): string {
  logInfo("normalizeId invoked");
  const normalized = id.trim().toUpperCase();
  logDebug("normalizeId result", { original: id, normalized });
  return normalized;
}
