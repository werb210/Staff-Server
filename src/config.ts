const requiredEnv = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "NODE_ENV",
] as const;

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

export function getLoginLockoutThreshold(): number {
  const value = Number(process.env.LOGIN_LOCKOUT_THRESHOLD ?? "5");
  return Number.isNaN(value) || value < 1 ? 5 : value;
}

export function getLoginLockoutMinutes(): number {
  const value = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? "15");
  return Number.isNaN(value) || value < 1 ? 15 : value;
}
