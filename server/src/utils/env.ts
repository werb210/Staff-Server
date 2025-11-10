/**
 * Environment utilities for loading and validating environment variables.
 */

import dotenv from "dotenv";
import { logDebug, logInfo, logWarn } from "./logger.js";

dotenv.config();

/**
 * Ensures that a required environment variable is present.
 * @param name - The name of the environment variable.
 * @param fallback - Optional fallback value if not set in process.env.
 * @returns The environment variable value.
 * @throws If the variable is missing and no fallback is provided.
 */
export function ensureEnvVar(name: string, fallback?: string): string {
  logInfo("ensureEnvVar invoked");
  const value = process.env[name] ?? fallback;
  if (!value) {
    logWarn(`Environment variable ${name} is not set`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  logDebug("ensureEnvVar result", { name, value });
  return value;
}

/**
 * Returns true if the current environment is production.
 */
export function isProduction(): boolean {
  logInfo("isProduction invoked");
  const result = process.env.NODE_ENV === "production";
  logDebug("isProduction result", { result });
  return result;
}

/**
 * Loads environment configuration and prints debug info.
 */
export function loadEnvironment(): void {
  logInfo("loadEnvironment invoked");
  logDebug("current environment snapshot", { env: process.env.NODE_ENV });
}
