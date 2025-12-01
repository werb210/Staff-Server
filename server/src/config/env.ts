import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: process.env.DATABASE_URL || "",
  AZURE_STORAGE_ACCOUNT:
    process.env.AZURE_STORAGE_ACCOUNT || process.env.BLOB_ACCOUNT || "",
  AZURE_STORAGE_KEY:
    process.env.AZURE_STORAGE_KEY ||
    process.env.AZURE_STORAGE_ACCESS_KEY ||
    process.env.BLOB_KEY ||
    "",
  AZURE_STORAGE_CONTAINER:
    process.env.AZURE_STORAGE_CONTAINER || process.env.BLOB_CONTAINER || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || "",
};

export const ENV = env;
