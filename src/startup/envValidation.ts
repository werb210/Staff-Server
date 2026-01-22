import { logError } from "../observability/logger";

const REQUIRED_AUTH_ENV = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "JWT_SECRET",
] as const;

function getMissingEnvKeys(): string[] {
  return REQUIRED_AUTH_ENV.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

export function assertRequiredAuthEnv(): void {
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
