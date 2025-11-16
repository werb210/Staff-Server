// server/src/utils/env.ts

import dotenv from "dotenv";
dotenv.config();

/**
 * Centralized environment variable loader.
 * Ensures all required env vars exist and provides typed access.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // JWT
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

  // Azure Blob Storage
  AZURE_BLOB_CONNECTION_STRING: requireEnv("AZURE_BLOB_CONNECTION_STRING"),
  AZURE_BLOB_CONTAINER: requireEnv("AZURE_BLOB_CONTAINER"),

  // Server
  PORT: process.env.PORT ?? "5000",
};

export default env;
