import dotenv from "dotenv";
import { logDebug, logInfo, logWarn } from "./logger.js";

dotenv.config();

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

export function isProduction(): boolean {
  logInfo("isProduction invoked");
  const result = process.env.NODE_ENV === "production";
  logDebug("isProduction result", { result });
  return result;
}

export function loadEnvironment(): void {
  logInfo("loadEnvironment invoked");
  logDebug("current environment snapshot", { env: process.env.NODE_ENV });
}
