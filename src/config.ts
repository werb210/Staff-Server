const requiredEnv = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"] as const;

export function assertEnv(): void {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`missing_env:${missing.join(",")}`);
  }
}

export function getAccessTokenExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "15m";
}

export function getRefreshTokenExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";
}
