import { logError } from "../observability/logger";

const REQUIRED_AUTH_ENV = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_TWIML_APP_SID",
  "TWILIO_PHONE_NUMBER",
] as const;

function getMissingEnvKeys(): string[] {
  return REQUIRED_AUTH_ENV.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

export function assertRequiredAuthEnv(): void {
  const nodeEnv = process.env.NODE_ENV ?? "";
  if (nodeEnv === "development" || nodeEnv === "test") {
    return;
  }
  const missing = getMissingEnvKeys();
  if (missing.length === 0) {
    return;
  }

  missing.forEach((key) => {
    logError("missing_env", { key });
  });

  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
}

assertRequiredAuthEnv();
