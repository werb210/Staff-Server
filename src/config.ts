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

export function getClientSubmissionRateLimitMax(): number {
  return parseRateLimit(
    process.env.CLIENT_SUBMISSION_RATE_LIMIT_MAX,
    rateLimitFallback(20, 2000)
  );
}

export function getClientSubmissionRateLimitWindowMs(): number {
  return parseRateLimit(
    process.env.CLIENT_SUBMISSION_RATE_LIMIT_WINDOW_MS,
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

export function getDocumentMaxSizeBytes(): number {
  const value = Number(process.env.DOCUMENT_MAX_SIZE_BYTES ?? "10485760");
  if (Number.isNaN(value) || value < 1) {
    return 10 * 1024 * 1024;
  }
  return value;
}

export function getDocumentAllowedMimeTypes(): string[] {
  const raw = process.env.DOCUMENT_ALLOWED_MIME_TYPES;
  if (!raw) {
    return ["application/pdf", "image/png", "image/jpeg"];
  }
  const values = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return values.length > 0 ? values : ["application/pdf", "image/png", "image/jpeg"];
}

export function getClientSubmissionOwnerUserId(): string {
  return process.env.CLIENT_SUBMISSION_OWNER_USER_ID ?? "client-submission-system";
}

export function getLenderRetryBaseDelayMs(): number {
  return parseIntervalMs(process.env.LENDER_RETRY_BASE_DELAY_MS, 60_000);
}

export function getLenderRetryMaxDelayMs(): number {
  return parseIntervalMs(process.env.LENDER_RETRY_MAX_DELAY_MS, 60 * 60 * 1000);
}

export function getLenderRetryMaxCount(): number {
  const value = Number(process.env.LENDER_RETRY_MAX_COUNT ?? "5");
  if (Number.isNaN(value) || value < 0) {
    return 5;
  }
  return value;
}

export function getBuildInfo(): { commitHash: string; buildTimestamp: string } {
  const commitHash = process.env.COMMIT_SHA;
  const buildTimestamp = process.env.BUILD_TIMESTAMP;
  if (!commitHash || !buildTimestamp) {
    throw new Error("missing_build_metadata");
  }
  return { commitHash, buildTimestamp };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (value.toLowerCase() === "true") {
    return true;
  }
  if (value.toLowerCase() === "false") {
    return false;
  }
  return fallback;
}

function parseIntervalMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function getReportingJobsEnabled(): boolean {
  const fallback = process.env.NODE_ENV !== "test";
  return parseBoolean(process.env.BI_JOBS_ENABLED, fallback);
}

export function getReportingDailyIntervalMs(): number {
  return parseIntervalMs(process.env.BI_DAILY_JOB_INTERVAL_MS, 24 * 60 * 60 * 1000);
}

export function getReportingHourlyIntervalMs(): number {
  return parseIntervalMs(process.env.BI_HOURLY_JOB_INTERVAL_MS, 60 * 60 * 1000);
}

export function getOpsKillSwitchReplay(): boolean {
  return parseBoolean(process.env.OPS_KILL_SWITCH_REPLAY, false);
}

export function getOpsKillSwitchExports(): boolean {
  return parseBoolean(process.env.OPS_KILL_SWITCH_EXPORTS, false);
}

export function getOpsKillSwitchLenderTransmission(): boolean {
  return parseBoolean(process.env.OPS_KILL_SWITCH_LENDER_TRANSMISSION, false);
}

export function getOpsKillSwitchOcr(): boolean {
  return parseBoolean(process.env.OPS_KILL_SWITCH_OCR, false);
}

export function getOcrEnabled(): boolean {
  return parseBoolean(process.env.OCR_ENABLED, true);
}

export function getOcrProvider(): string {
  return process.env.OCR_PROVIDER ?? "openai";
}

export function getOcrTimeoutMs(): number {
  return parseIntervalMs(process.env.OCR_TIMEOUT_MS, 30_000);
}

export function getOcrMaxAttempts(): number {
  const value = Number(process.env.OCR_MAX_ATTEMPTS ?? "5");
  if (Number.isNaN(value) || value < 1) {
    return 5;
  }
  return value;
}

export function getOcrWorkerConcurrency(): number {
  const value = Number(process.env.OCR_WORKER_CONCURRENCY ?? "4");
  if (Number.isNaN(value) || value < 1) {
    return 4;
  }
  return value;
}

export function getOcrPollIntervalMs(): number {
  return parseIntervalMs(process.env.OCR_POLL_INTERVAL_MS, 10_000);
}

export function getOpenAiApiKey(): string | null {
  return process.env.OPENAI_API_KEY ?? null;
}

export function getOpenAiOcrModel(): string {
  return process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini";
}
