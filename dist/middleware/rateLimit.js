"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimit = loginRateLimit;
exports.refreshRateLimit = refreshRateLimit;
exports.passwordResetRateLimit = passwordResetRateLimit;
exports.resetLoginRateLimit = resetLoginRateLimit;
exports.documentUploadRateLimit = documentUploadRateLimit;
exports.clientSubmissionRateLimit = clientSubmissionRateLimit;
exports.lenderSubmissionRateLimit = lenderSubmissionRateLimit;
exports.adminRateLimit = adminRateLimit;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("./errors");
const config_1 = require("../config");
const attemptsByKey = new Map();
function createRateLimiter(keyBuilder, maxAttempts = 10, windowMs = 60_000) {
    return (req, _res, next) => {
        const key = keyBuilder(req);
        const now = Date.now();
        const entry = attemptsByKey.get(key);
        if (!entry || entry.resetAt < now) {
            attemptsByKey.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }
        entry.count += 1;
        if (entry.count > maxAttempts) {
            next(new errors_1.AppError("rate_limited", "Too many attempts.", 429));
            return;
        }
        next();
    };
}
function loginRateLimit(maxAttempts = (0, config_1.getLoginRateLimitMax)(), windowMs = (0, config_1.getLoginRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const email = typeof req.body?.email === "string"
            ? req.body.email.toLowerCase()
            : "unknown";
        return `login:${ip}:${email}`;
    }, maxAttempts, windowMs);
}
function refreshRateLimit(maxAttempts = (0, config_1.getRefreshRateLimitMax)(), windowMs = (0, config_1.getRefreshRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const token = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
        const decoded = token ? jsonwebtoken_1.default.decode(token) : null;
        const userId = decoded?.userId ?? "unknown";
        return `refresh:${ip}:${userId}`;
    }, maxAttempts, windowMs);
}
function passwordResetRateLimit(maxAttempts = (0, config_1.getPasswordResetRateLimitMax)(), windowMs = (0, config_1.getPasswordResetRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const userId = typeof req.body?.userId === "string" ? req.body.userId : "unknown";
        const token = typeof req.body?.token === "string" ? req.body.token : "unknown";
        return `password_reset:${ip}:${userId}:${token}`;
    }, maxAttempts, windowMs);
}
function resetLoginRateLimit() {
    attemptsByKey.clear();
}
function documentUploadRateLimit(maxAttempts = (0, config_1.getDocumentUploadRateLimitMax)(), windowMs = (0, config_1.getDocumentUploadRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const userId = req.user?.userId ?? "unknown";
        const applicationId = typeof req.params?.id === "string" ? req.params.id : "unknown";
        return `document_upload:${ip}:${userId}:${applicationId}`;
    }, maxAttempts, windowMs);
}
function clientSubmissionRateLimit(maxAttempts = (0, config_1.getClientSubmissionRateLimitMax)(), windowMs = (0, config_1.getClientSubmissionRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const submissionKey = typeof req.body?.submissionKey === "string" ? req.body.submissionKey : "unknown";
        return `client_submission:${ip}:${submissionKey}`;
    }, maxAttempts, windowMs);
}
function lenderSubmissionRateLimit(maxAttempts = (0, config_1.getLenderSubmissionRateLimitMax)(), windowMs = (0, config_1.getLenderSubmissionRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const userId = req.user?.userId ?? "unknown";
        const applicationId = typeof req.body?.applicationId === "string"
            ? req.body.applicationId
            : "unknown";
        return `lender_submission:${ip}:${userId}:${applicationId}`;
    }, maxAttempts, windowMs);
}
function adminRateLimit(maxAttempts = (0, config_1.getAdminRateLimitMax)(), windowMs = (0, config_1.getAdminRateLimitWindowMs)()) {
    return createRateLimiter((req) => {
        const ip = req.ip || "unknown";
        const userId = req.user?.userId ?? "unknown";
        return `admin:${ip}:${userId}`;
    }, maxAttempts, windowMs);
}
