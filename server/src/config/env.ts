// server/src/config/env.ts
import dotenv from 'dotenv';
dotenv.config();

//
// ========================================================
//  ENVIRONMENT VARIABLES REQUIRED FOR STAFF-SERVER
//  If any are missing → the server MUST NOT START.
// ========================================================
//

type EnvShape = {
  NODE_ENV: string;

  PORT: number;

  // Azure Blob Storage
  AZURE_STORAGE_ACCOUNT: string;
  AZURE_STORAGE_ACCESS_KEY: string;
  AZURE_STORAGE_CONTAINER: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // CORS
  CORS_ORIGIN: string;

  // SignNow
  SIGNNOW_CLIENT_ID: string;
  SIGNNOW_CLIENT_SECRET: string;

  // Internal Silos (BF / BI / SLF)
  SILO_NAME: string;  // "BF", "BI", or "SLF"
};

const requiredVars = [
  'NODE_ENV',
  'PORT',

  // Azure Blob
  'AZURE_STORAGE_ACCOUNT',
  'AZURE_STORAGE_ACCESS_KEY',
  'AZURE_STORAGE_CONTAINER',

  // Database
  'DATABASE_URL',

  // JWT
  'JWT_SECRET',
  'JWT_EXPIRES_IN',

  // CORS
  'CORS_ORIGIN',

  // SignNow
  'SIGNNOW_CLIENT_ID',
  'SIGNNOW_CLIENT_SECRET',

  // Silo Name
  'SILO_NAME',
];

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export function loadEnv(): EnvShape {
  const envObject: any = {};

  for (const key of requiredVars) {
    envObject[key] = getEnv(key);
  }

  // Type conversions
  envObject.PORT = Number(envObject.PORT);

  // Silo safety check
  if (!['BF', 'BI', 'SLF'].includes(envObject.SILO_NAME.toUpperCase())) {
    console.error(`❌ Invalid SILO_NAME. Must be "BF", "BI", or "SLF". Got: ${envObject.SILO_NAME}`);
    process.exit(1);
  }

  return envObject as EnvShape;
}
