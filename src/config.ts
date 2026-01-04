const requiredEnv = [
  "BUILD_TIMESTAMP",
  "COMMIT_SHA",
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

export function getPasswordMaxAgeDays(): number {
  const value = Number(process.env.PASSWORD_MAX_AGE_DAYS ?? "90");
  return Number.isNaN(value) || value < 1 ? 90 : value;
}

function parseRateLimit(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function rateLimitFallback(normal: number, test: number): number {
  return process.env.NODE_ENV === "test" ? test : normal;
}

export function getLoginRateLimitMax(): number {
  return parseRateLimit(
    process.env.LOGIN_RATE_LIMIT_MAX,
    rateLimitFallback(10, 1000)
  );
}

export function getLoginRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
    rateLimitFallback(60_000, 60_000)
  );
}

export function getRefreshRateLimitMax(): number {
  return parseRateLimit(
    process.env.REFRESH_RATE_LIMIT_MAX,
    rateLimitFallback(10, 1000)
  );
}

export function getRefreshRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.REFRESH_RATE_LIMIT_WINDOW_MS,
    rateLimitFallback(60_000, 60_000)
  );
}

export function getPasswordResetRateLimitMax(): number {
  return parseRateLimit(
    process.env.PASSWORD_RESET_RATE_LIMIT_MAX,
    rateLimitFallback(5, 500)
  );
}

export function getPasswordResetRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    rateLimitFallback(60_000, 60_000)
  );
}

export function getDocumentUploadRateLimitMax(): number {
  return parseRateLimit(
    process.env.DOCUMENT_UPLOAD_RATE_LIMIT_MAX,
    rateLimitFallback(20, 2000)
  );
}

export function getDocumentUploadRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.DOCUMENT_UPLOAD_RATE_LIMIT_WINDOW_MS,
    rateLimitFallback(60_000, 60_000)
  );
}

export function getLenderSubmissionRateLimitMax(): number {
  return parseRateLimit(
    process.env.LENDER_SUBMISSION_RATE_LIMIT_MAX,
    rateLimitFallback(10, 1000)
  );
}

export function getLenderSubmissionRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.LENDER_SUBMISSION_RATE_LIMIT_WINDOW_MS,
    rateLimitFallback(60_000, 60_000)
  );
}

export function getAdminRateLimitMax(): number {
  return parseRateLimit(
    process.env.ADMIN_RATE_LIMIT_MAX,
    rateLimitFallback(120, 2000)
  );
}

export function getAdminRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.ADMIN_RATE_LIMIT_WINDOW_MS,
    rateLimitFallback(60_000, 60_000)
  );
}

export function getBuildInfo(): { commitHash: string; buildTimestamp: string } {
  const commitHash = process.env.COMMIT_SHA;
  const buildTimestamp = process.env.BUILD_TIMESTAMP;
  if (!commitHash || !buildTimestamp) {
    throw new Error("missing_build_metadata");
  }
  return { commitHash, buildTimestamp };
}
