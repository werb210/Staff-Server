import { logDebug, logInfo } from "./logger.js";

export function validateGovernmentId(id: string): boolean {
  logInfo("validateGovernmentId invoked");
  const isValid = /^[A-Z0-9]{6,}$/i.test(id);
  logDebug("validateGovernmentId result", { id, isValid });
  return isValid;
}

export function validateApplicationId(id: string): boolean {
  logInfo("validateApplicationId invoked");
  const isValid = /^APP-[0-9]{6}$/i.test(id);
  logDebug("validateApplicationId result", { id, isValid });
  return isValid;
}

export function normalizeId(id: string): string {
  logInfo("normalizeId invoked");
  const normalized = id.trim().toUpperCase();
  logDebug("normalizeId result", { original: id, normalized });
  return normalized;
}
