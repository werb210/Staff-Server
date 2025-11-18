import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }

  return value;
}

type EnvConfig = {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  AZURE_STORAGE_CONNECTION_STRING: string;
  AZURE_CONTAINER: string;
};

export const ENV: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "5000",
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  AZURE_STORAGE_CONNECTION_STRING: requireEnv("AZURE_STORAGE_CONNECTION_STRING"),
  AZURE_CONTAINER: requireEnv("AZURE_CONTAINER"),
};

export default ENV;
