import { config } from 'dotenv';

config();

type RequiredStringKey =
  | 'DATABASE_URL'
  | 'JWT_SECRET'
  | 'AZURE_STORAGE_CONNECTION_STRING'
  | 'AZURE_BLOB_CONTAINER'
  | 'OPENAI_API_KEY'
  | 'TWILIO_ACCOUNT_SID'
  | 'TWILIO_AUTH_TOKEN'
  | 'TWILIO_FROM_NUMBER';

type OptionalKey = 'JWT_ISSUER' | 'REFRESH_TOKEN_TTL_DAYS' | 'ACCESS_TOKEN_TTL_MINUTES' | 'DATABASE_POOL_MAX';

type EnvConfig = Record<RequiredStringKey, string> & Partial<Record<OptionalKey, string>> & { PORT: number };

function readEnv(key: RequiredStringKey | OptionalKey, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
}

const PORT = Number.parseInt(process.env.PORT || '3000', 10);

export const env: EnvConfig = {
  PORT,
  DATABASE_URL: readEnv('DATABASE_URL'),
  JWT_SECRET: readEnv('JWT_SECRET'),
  AZURE_STORAGE_CONNECTION_STRING: readEnv('AZURE_STORAGE_CONNECTION_STRING'),
  AZURE_BLOB_CONTAINER: readEnv('AZURE_BLOB_CONTAINER'),
  OPENAI_API_KEY: readEnv('OPENAI_API_KEY'),
  TWILIO_ACCOUNT_SID: readEnv('TWILIO_ACCOUNT_SID'),
  TWILIO_AUTH_TOKEN: readEnv('TWILIO_AUTH_TOKEN'),
  TWILIO_FROM_NUMBER: readEnv('TWILIO_FROM_NUMBER'),
  JWT_ISSUER: process.env.JWT_ISSUER,
  REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS,
  ACCESS_TOKEN_TTL_MINUTES: process.env.ACCESS_TOKEN_TTL_MINUTES,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
};

export function optionalNumber(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
