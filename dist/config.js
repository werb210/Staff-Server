"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMIT_SHA = exports.BUILD_TIMESTAMP = void 0;
exports.getBuildInfo = getBuildInfo;
exports.assertEnv = assertEnv;
exports.getAccessTokenExpiresIn = getAccessTokenExpiresIn;
exports.getRefreshTokenExpiresIn = getRefreshTokenExpiresIn;
exports.getLoginLockoutThreshold = getLoginLockoutThreshold;
exports.getLoginLockoutMinutes = getLoginLockoutMinutes;
exports.getPasswordMaxAgeDays = getPasswordMaxAgeDays;
exports.getDocumentAllowedMimeTypes = getDocumentAllowedMimeTypes;
exports.getDocumentMaxSizeBytes = getDocumentMaxSizeBytes;
exports.getClientSubmissionOwnerUserId = getClientSubmissionOwnerUserId;
exports.getReportingJobsEnabled = getReportingJobsEnabled;
exports.getReportingDailyIntervalMs = getReportingDailyIntervalMs;
exports.getReportingHourlyIntervalMs = getReportingHourlyIntervalMs;
exports.getOpsKillSwitchReplay = getOpsKillSwitchReplay;
exports.getOpsKillSwitchExports = getOpsKillSwitchExports;
exports.getOpsKillSwitchOcr = getOpsKillSwitchOcr;
exports.getOpsKillSwitchLenderTransmission = getOpsKillSwitchLenderTransmission;
exports.getLenderRetryBaseDelayMs = getLenderRetryBaseDelayMs;
exports.getLenderRetryMaxDelayMs = getLenderRetryMaxDelayMs;
exports.getLenderRetryMaxCount = getLenderRetryMaxCount;
exports.getOcrLockTimeoutMinutes = getOcrLockTimeoutMinutes;
exports.getOcrEnabled = getOcrEnabled;
exports.getOcrPollIntervalMs = getOcrPollIntervalMs;
exports.getOcrWorkerConcurrency = getOcrWorkerConcurrency;
exports.getOcrProvider = getOcrProvider;
exports.getOcrMaxAttempts = getOcrMaxAttempts;
exports.getOcrTimeoutMs = getOcrTimeoutMs;
exports.getOpenAiApiKey = getOpenAiApiKey;
exports.getOpenAiOcrModel = getOpenAiOcrModel;
exports.getLoginRateLimitMax = getLoginRateLimitMax;
exports.getLoginRateLimitWindowMs = getLoginRateLimitWindowMs;
exports.getRefreshRateLimitMax = getRefreshRateLimitMax;
exports.getRefreshRateLimitWindowMs = getRefreshRateLimitWindowMs;
exports.getPasswordResetRateLimitMax = getPasswordResetRateLimitMax;
exports.getPasswordResetRateLimitWindowMs = getPasswordResetRateLimitWindowMs;
exports.getDocumentUploadRateLimitMax = getDocumentUploadRateLimitMax;
exports.getDocumentUploadRateLimitWindowMs = getDocumentUploadRateLimitWindowMs;
exports.getClientSubmissionRateLimitMax = getClientSubmissionRateLimitMax;
exports.getClientSubmissionRateLimitWindowMs = getClientSubmissionRateLimitWindowMs;
exports.getLenderSubmissionRateLimitMax = getLenderSubmissionRateLimitMax;
exports.getLenderSubmissionRateLimitWindowMs = getLenderSubmissionRateLimitWindowMs;
exports.getAdminRateLimitMax = getAdminRateLimitMax;
exports.getAdminRateLimitWindowMs = getAdminRateLimitWindowMs;
const requiredRuntimeEnv = [
    "DATABASE_URL",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
];
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
}
function parsePositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.floor(parsed);
}
function parseBoolean(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
    }
    return fallback;
}
function parseCsv(value, fallback) {
    if (!value) {
        return fallback;
    }
    const entries = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    return entries.length > 0 ? entries : fallback;
}
const buildTimestampEnv = process.env.BUILD_TIMESTAMP;
const commitShaEnv = process.env.COMMIT_SHA;
if (buildTimestampEnv) {
    console.info("build_timestamp", { buildTimestamp: buildTimestampEnv });
}
if (commitShaEnv) {
    console.info("commit_sha", { commitSha: commitShaEnv });
}
/**
 * Optional build metadata.
 * These MUST NOT crash the server if missing.
 */
exports.BUILD_TIMESTAMP = buildTimestampEnv ?? "unknown";
exports.COMMIT_SHA = commitShaEnv ?? "unknown";
function getBuildInfo() {
    return {
        commitHash: exports.COMMIT_SHA,
        buildTimestamp: exports.BUILD_TIMESTAMP,
    };
}
/**
 * Runtime environment validation.
 * Only true runtime dependencies are enforced.
 */
function assertEnv() {
    const missing = requiredRuntimeEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`missing_env:${missing.join(",")}`);
    }
}
function getAccessTokenExpiresIn() {
    return process.env.JWT_EXPIRES_IN ?? "15m";
}
function getRefreshTokenExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";
}
function getLoginLockoutThreshold() {
    return parsePositiveInt(process.env.LOGIN_LOCKOUT_THRESHOLD, 5);
}
function getLoginLockoutMinutes() {
    return parsePositiveInt(process.env.LOGIN_LOCKOUT_MINUTES, 15);
}
function getPasswordMaxAgeDays() {
    return parsePositiveInt(process.env.PASSWORD_MAX_AGE_DAYS, 90);
}
function getDocumentAllowedMimeTypes() {
    return parseCsv(process.env.DOCUMENT_ALLOWED_MIME_TYPES, [
        "application/pdf",
        "image/png",
        "image/jpeg",
    ]);
}
function getDocumentMaxSizeBytes() {
    return parsePositiveInt(process.env.DOCUMENT_MAX_SIZE_BYTES, 10 * 1024 * 1024);
}
function getClientSubmissionOwnerUserId() {
    return process.env.CLIENT_SUBMISSION_OWNER_USER_ID ?? "client-submission-system";
}
function getReportingJobsEnabled() {
    return parseBoolean(process.env.REPORTING_JOBS_ENABLED, true);
}
function getReportingDailyIntervalMs() {
    return parsePositiveInt(process.env.REPORTING_DAILY_INTERVAL_MS, 24 * 60 * 60 * 1000);
}
function getReportingHourlyIntervalMs() {
    return parsePositiveInt(process.env.REPORTING_HOURLY_INTERVAL_MS, 60 * 60 * 1000);
}
function getOpsKillSwitchReplay() {
    return parseBoolean(process.env.OPS_KILL_SWITCH_REPLAY, false);
}
function getOpsKillSwitchExports() {
    return parseBoolean(process.env.OPS_KILL_SWITCH_EXPORTS, false);
}
function getOpsKillSwitchOcr() {
    return parseBoolean(process.env.OPS_KILL_SWITCH_OCR, false);
}
function getOpsKillSwitchLenderTransmission() {
    return parseBoolean(process.env.OPS_KILL_SWITCH_LENDER_TRANSMISSION, false);
}
function getLenderRetryBaseDelayMs() {
    return parsePositiveInt(process.env.LENDER_RETRY_BASE_DELAY_MS, 30_000);
}
function getLenderRetryMaxDelayMs() {
    return parsePositiveInt(process.env.LENDER_RETRY_MAX_DELAY_MS, 5 * 60 * 1000);
}
function getLenderRetryMaxCount() {
    return parsePositiveInt(process.env.LENDER_RETRY_MAX_COUNT, 5);
}
function getOcrLockTimeoutMinutes() {
    return parsePositiveInt(process.env.OCR_LOCK_TIMEOUT_MINUTES, 15);
}
function getOcrEnabled() {
    return parseBoolean(process.env.OCR_ENABLED, false);
}
function getOcrPollIntervalMs() {
    return parsePositiveInt(process.env.OCR_POLL_INTERVAL_MS, 10_000);
}
function getOcrWorkerConcurrency() {
    return parsePositiveInt(process.env.OCR_WORKER_CONCURRENCY, 2);
}
function getOcrProvider() {
    return process.env.OCR_PROVIDER ?? "openai";
}
function getOcrMaxAttempts() {
    return parsePositiveInt(process.env.OCR_MAX_ATTEMPTS, 3);
}
function getOcrTimeoutMs() {
    return parsePositiveInt(process.env.OCR_TIMEOUT_MS, 30_000);
}
function getOpenAiApiKey() {
    return process.env.OPENAI_API_KEY;
}
function getOpenAiOcrModel() {
    return process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini";
}
function getLoginRateLimitMax() {
    return parsePositiveInt(process.env.LOGIN_RATE_LIMIT_MAX, 10);
}
function getLoginRateLimitWindowMs() {
    return parsePositiveInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 60_000);
}
function getRefreshRateLimitMax() {
    return parsePositiveInt(process.env.REFRESH_RATE_LIMIT_MAX, 15);
}
function getRefreshRateLimitWindowMs() {
    return parsePositiveInt(process.env.REFRESH_RATE_LIMIT_WINDOW_MS, 60_000);
}
function getPasswordResetRateLimitMax() {
    return parsePositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 5);
}
function getPasswordResetRateLimitWindowMs() {
    return parsePositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS, 15 * 60_000);
}
function getDocumentUploadRateLimitMax() {
    return parsePositiveInt(process.env.DOCUMENT_UPLOAD_RATE_LIMIT_MAX, 20);
}
function getDocumentUploadRateLimitWindowMs() {
    return parsePositiveInt(process.env.DOCUMENT_UPLOAD_RATE_LIMIT_WINDOW_MS, 60_000);
}
function getClientSubmissionRateLimitMax() {
    return parsePositiveInt(process.env.CLIENT_SUBMISSION_RATE_LIMIT_MAX, 10);
}
function getClientSubmissionRateLimitWindowMs() {
    return parsePositiveInt(process.env.CLIENT_SUBMISSION_RATE_LIMIT_WINDOW_MS, 60_000);
}
function getLenderSubmissionRateLimitMax() {
    return parsePositiveInt(process.env.LENDER_SUBMISSION_RATE_LIMIT_MAX, 10);
}
function getLenderSubmissionRateLimitWindowMs() {
    return parsePositiveInt(process.env.LENDER_SUBMISSION_RATE_LIMIT_WINDOW_MS, 60_000);
}
function getAdminRateLimitMax() {
    return parsePositiveInt(process.env.ADMIN_RATE_LIMIT_MAX, 30);
}
function getAdminRateLimitWindowMs() {
    return parsePositiveInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS, 60_000);
}
