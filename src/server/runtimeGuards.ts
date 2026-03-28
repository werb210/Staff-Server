declare global {
  // eslint-disable-next-line no-var
  var __SERVER_STARTED__: boolean | undefined;
}

export function assertRequiredEnv(env: NodeJS.ProcessEnv): void {
  const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];

  if (env.NODE_ENV === "test") {
    return;
  }

  for (const key of requiredEnv) {
    if (!env[key]) {
      throw new Error(`MISSING_ENV: ${key}`);
    }
  }

  if (!env.REDIS_URL) {
    throw new Error("REDIS_REQUIRED");
  }

  if (!env.TWILIO_ACCOUNT_SID) {
    throw new Error("TWILIO_REQUIRED");
  }

}

export function assertSingleServerStart(): void {
  if (global.__SERVER_STARTED__) {
    throw new Error("SERVER_ALREADY_STARTED");
  }

  global.__SERVER_STARTED__ = true;
}
