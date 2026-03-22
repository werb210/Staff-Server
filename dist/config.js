"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMIT_SHA = exports.BUILD_TIMESTAMP = void 0;
exports.getBuildInfo = getBuildInfo;
exports.assertEnv = assertEnv;
exports.getAccessTokenExpiresIn = getAccessTokenExpiresIn;
exports.getAccessTokenSecret = getAccessTokenSecret;
exports.getRefreshTokenSecret = getRefreshTokenSecret;
exports.getRefreshTokenExpiresIn = getRefreshTokenExpiresIn;
exports.getRefreshTokenExpiresInMs = getRefreshTokenExpiresInMs;
exports.getJwtClockSkewSeconds = getJwtClockSkewSeconds;
exports.getLoginLockoutThreshold = getLoginLockoutThreshold;
exports.getLoginLockoutMinutes = getLoginLockoutMinutes;
exports.getLoginTimeoutMs = getLoginTimeoutMs;
exports.getPasswordMaxAgeDays = getPasswordMaxAgeDays;
exports.getVoiceRestrictedNumbers = getVoiceRestrictedNumbers;
exports.getDocumentAllowedMimeTypes = getDocumentAllowedMimeTypes;
exports.getDocumentMaxSizeBytes = getDocumentMaxSizeBytes;
exports.getClientSubmissionOwnerUserId = getClientSubmissionOwnerUserId;
exports.getReportingJobsEnabled = getReportingJobsEnabled;
exports.getReportingDailyIntervalMs = getReportingDailyIntervalMs;
exports.getReportingHourlyIntervalMs = getReportingHourlyIntervalMs;
exports.getFollowUpJobsEnabled = getFollowUpJobsEnabled;
exports.getFollowUpJobsIntervalMs = getFollowUpJobsIntervalMs;
exports.getOpsKillSwitchReplay = getOpsKillSwitchReplay;
exports.getOpsKillSwitchExports = getOpsKillSwitchExports;
exports.getOpsKillSwitchOcr = getOpsKillSwitchOcr;
exports.getOpsKillSwitchLenderTransmission = getOpsKillSwitchLenderTransmission;
exports.getLenderRetryBaseDelayMs = getLenderRetryBaseDelayMs;
exports.getLenderRetryMaxDelayMs = getLenderRetryMaxDelayMs;
exports.getLenderRetryMaxCount = getLenderRetryMaxCount;
exports.getRequestTimeoutMs = getRequestTimeoutMs;
exports.getOcrLockTimeoutMinutes = getOcrLockTimeoutMinutes;
exports.getOcrEnabled = getOcrEnabled;
exports.getOcrPollIntervalMs = getOcrPollIntervalMs;
exports.getOcrWorkerConcurrency = getOcrWorkerConcurrency;
exports.getOcrProvider = getOcrProvider;
exports.getOcrMaxAttempts = getOcrMaxAttempts;
exports.getOcrTimeoutMs = getOcrTimeoutMs;
exports.getVapidPublicKey = getVapidPublicKey;
exports.getVapidPrivateKey = getVapidPrivateKey;
exports.getVapidSubject = getVapidSubject;
exports.getPwaPushRateLimitMax = getPwaPushRateLimitMax;
exports.getPwaPushRateLimitWindowMs = getPwaPushRateLimitWindowMs;
exports.getPwaPushPayloadMaxBytes = getPwaPushPayloadMaxBytes;
exports.getPwaSyncMaxActions = getPwaSyncMaxActions;
exports.getPwaSyncActionMaxBytes = getPwaSyncActionMaxBytes;
exports.getPwaSyncBatchMaxBytes = getPwaSyncBatchMaxBytes;
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
exports.getCorsAllowlistConfig = getCorsAllowlistConfig;
exports.getGlobalRateLimitWindowMsConfig = getGlobalRateLimitWindowMsConfig;
exports.getGlobalRateLimitMaxConfig = getGlobalRateLimitMaxConfig;
exports.getRateLimitEnabled = getRateLimitEnabled;
exports.getIdempotencyEnabled = getIdempotencyEnabled;
exports.getAuditHistoryEnabled = getAuditHistoryEnabled;
exports.getRetryPolicyEnabled = getRetryPolicyEnabled;
exports.getAppInsightsConnectionStringConfig = getAppInsightsConnectionStringConfig;
exports.isTestEnvironment = isTestEnvironment;
exports.isProductionEnvironment = isProductionEnvironment;
exports.getRequestBodyLimit = getRequestBodyLimit;
exports.getDbPoolMax = getDbPoolMax;
exports.getDbPoolIdleTimeoutMs = getDbPoolIdleTimeoutMs;
exports.getDbPoolConnectionTimeoutMs = getDbPoolConnectionTimeoutMs;
exports.shouldRunMigrations = shouldRunMigrations;
exports.getAiModel = getAiModel;
exports.getAiEmbeddingModel = getAiEmbeddingModel;
const env_1 = require("./config/env");
const logger_1 = require("./observability/logger");
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
    (0, logger_1.logInfo)("build_timestamp", { buildTimestamp: buildTimestampEnv });
}
if (commitShaEnv) {
    (0, logger_1.logInfo)("commit_sha", { commitSha: commitShaEnv });
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
    return;
}
function getAccessTokenExpiresIn() {
    return process.env.JWT_EXPIRES_IN ?? "15m";
}
function getAccessTokenSecret() {
    return env_1.ENV.JWT_SECRET;
}
function getRefreshTokenSecret() {
    return env_1.ENV.JWT_REFRESH_SECRET;
}
function getRefreshTokenExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";
}
function getRefreshTokenExpiresInMs() {
    return parsePositiveInt(process.env.JWT_REFRESH_EXPIRES_IN_MS, 30 * 24 * 60 * 60 * 1000);
}
function getJwtClockSkewSeconds() {
    return parsePositiveInt(process.env.JWT_CLOCK_SKEW_SECONDS, 30);
}
function getLoginLockoutThreshold() {
    return parsePositiveInt(process.env.LOGIN_LOCKOUT_THRESHOLD, 5);
}
function getLoginLockoutMinutes() {
    return parsePositiveInt(process.env.LOGIN_LOCKOUT_MINUTES, 15);
}
function getLoginTimeoutMs() {
    const configured = parsePositiveInt(process.env.LOGIN_TIMEOUT_MS, 5000);
    return Math.min(configured, 5000);
}
function getPasswordMaxAgeDays() {
    return parsePositiveInt(process.env.PASSWORD_MAX_AGE_DAYS, 90);
}
function getVoiceRestrictedNumbers() {
    return parseCsv(process.env.VOICE_RESTRICTED_NUMBERS, []);
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
    return (process.env.CLIENT_SUBMISSION_OWNER_USER_ID ??
        "00000000-0000-0000-0000-000000000001");
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
function getFollowUpJobsEnabled() {
    return parseBoolean(process.env.FOLLOWUP_JOBS_ENABLED, !env_1.ENV.TEST_MODE);
}
function getFollowUpJobsIntervalMs() {
    return parsePositiveInt(process.env.FOLLOWUP_JOBS_INTERVAL_MS, 5 * 60 * 1000);
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
    return parsePositiveInt(process.env.LENDER_RETRY_BASE_DELAY_MS, 30000);
}
function getLenderRetryMaxDelayMs() {
    return parsePositiveInt(process.env.LENDER_RETRY_MAX_DELAY_MS, 5 * 60 * 1000);
}
function getLenderRetryMaxCount() {
    return parsePositiveInt(process.env.LENDER_RETRY_MAX_COUNT, 5);
}
function getRequestTimeoutMs() {
    return parsePositiveInt(process.env.REQUEST_TIMEOUT_MS, 10000);
}
function getOcrLockTimeoutMinutes() {
    return parsePositiveInt(process.env.OCR_LOCK_TIMEOUT_MINUTES, 15);
}
function getOcrEnabled() {
    return parseBoolean(process.env.OCR_ENABLED, false);
}
function getOcrPollIntervalMs() {
    return parsePositiveInt(process.env.OCR_POLL_INTERVAL_MS, 10000);
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
    return parsePositiveInt(process.env.OCR_TIMEOUT_MS, 30000);
}
function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
}
function getVapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY;
}
function getVapidSubject() {
    return process.env.VAPID_SUBJECT;
}
function getPwaPushRateLimitMax() {
    return parsePositiveInt(process.env.PWA_PUSH_RATE_LIMIT_MAX, 20);
}
function getPwaPushRateLimitWindowMs() {
    return parsePositiveInt(process.env.PWA_PUSH_RATE_LIMIT_WINDOW_MS, 60000);
}
function getPwaPushPayloadMaxBytes() {
    return parsePositiveInt(process.env.PWA_PUSH_MAX_BYTES, 4096);
}
function getPwaSyncMaxActions() {
    return parsePositiveInt(process.env.PWA_SYNC_MAX_ACTIONS, 25);
}
function getPwaSyncActionMaxBytes() {
    return parsePositiveInt(process.env.PWA_SYNC_ACTION_MAX_BYTES, 25000);
}
function getPwaSyncBatchMaxBytes() {
    return parsePositiveInt(process.env.PWA_SYNC_BATCH_MAX_BYTES, 100000);
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
    return parsePositiveInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 60000);
}
function getRefreshRateLimitMax() {
    return parsePositiveInt(process.env.REFRESH_RATE_LIMIT_MAX, 15);
}
function getRefreshRateLimitWindowMs() {
    return parsePositiveInt(process.env.REFRESH_RATE_LIMIT_WINDOW_MS, 60000);
}
function getPasswordResetRateLimitMax() {
    return parsePositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 5);
}
function getPasswordResetRateLimitWindowMs() {
    return parsePositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS, 15 * 60000);
}
function getDocumentUploadRateLimitMax() {
    return parsePositiveInt(process.env.DOCUMENT_UPLOAD_RATE_LIMIT_MAX, 20);
}
function getDocumentUploadRateLimitWindowMs() {
    return parsePositiveInt(process.env.DOCUMENT_UPLOAD_RATE_LIMIT_WINDOW_MS, 60000);
}
function getClientSubmissionRateLimitMax() {
    return parsePositiveInt(process.env.CLIENT_SUBMISSION_RATE_LIMIT_MAX, 5);
}
function getClientSubmissionRateLimitWindowMs() {
    return parsePositiveInt(process.env.CLIENT_SUBMISSION_RATE_LIMIT_WINDOW_MS, 60000);
}
function getLenderSubmissionRateLimitMax() {
    return parsePositiveInt(process.env.LENDER_SUBMISSION_RATE_LIMIT_MAX, 10);
}
function getLenderSubmissionRateLimitWindowMs() {
    return parsePositiveInt(process.env.LENDER_SUBMISSION_RATE_LIMIT_WINDOW_MS, 60000);
}
function getAdminRateLimitMax() {
    return parsePositiveInt(process.env.ADMIN_RATE_LIMIT_MAX, 30);
}
function getAdminRateLimitWindowMs() {
    return parsePositiveInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS, 60000);
}
function getCorsAllowlistConfig() {
    return [env_1.ENV.CLIENT_URL, env_1.ENV.PORTAL_URL].filter(Boolean);
}
function getGlobalRateLimitWindowMsConfig() {
    return parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
}
function getGlobalRateLimitMaxConfig() {
    return parsePositiveInt(process.env.RATE_LIMIT_MAX, 100);
}
function getRateLimitEnabled() {
    if (process.env.ENABLE_RATE_LIMITING !== undefined) {
        return parseBoolean(process.env.ENABLE_RATE_LIMITING, !env_1.ENV.TEST_MODE);
    }
    return parseBoolean(process.env.RATE_LIMIT_ENABLED, !env_1.ENV.TEST_MODE);
}
function getIdempotencyEnabled() {
    return parseBoolean(process.env.ENABLE_IDEMPOTENCY, true);
}
function getAuditHistoryEnabled() {
    return parseBoolean(process.env.ENABLE_AUDIT_HISTORY, true);
}
function getRetryPolicyEnabled() {
    return parseBoolean(process.env.ENABLE_RETRY_POLICY, true);
}
function getAppInsightsConnectionStringConfig() {
    return process.env.APPINSIGHTS_CONNECTION_STRING ?? "";
}
function isTestEnvironment() {
    return env_1.ENV.TEST_MODE;
}
function isProductionEnvironment() {
    return process.env.NODE_ENV === "production";
}
function getRequestBodyLimit() {
    return process.env.REQUEST_BODY_LIMIT ?? "1mb";
}
function getDbPoolMax() {
    return parsePositiveInt(process.env.DB_POOL_MAX, 10);
}
function getDbPoolIdleTimeoutMs() {
    return parsePositiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000);
}
function getDbPoolConnectionTimeoutMs() {
    const requestTimeoutMs = getRequestTimeoutMs();
    const configured = parsePositiveInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 10000);
    if (configured < requestTimeoutMs) {
        return configured;
    }
    return Math.max(1, requestTimeoutMs - 100);
}
function shouldRunMigrations() {
    return isProductionEnvironment() || process.env.RUN_MIGRATIONS === "true";
}
function getAiModel() {
    return process.env.AI_MODEL ?? "gpt-4o-mini";
}
function getAiEmbeddingModel() {
    return process.env.AI_EMBED_MODEL ?? "text-embedding-3-small";
}
