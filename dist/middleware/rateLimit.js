"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpLimiter = exports.clientDocumentsRateLimit = exports.clientReadRateLimit = exports.portalRateLimit = exports.voiceRateLimit = exports.lenderSubmissionRateLimit = exports.clientSubmissionRateLimit = exports.documentUploadRateLimit = exports.apiRateLimit = exports.globalRateLimit = exports.globalLimiter = void 0;
exports.pushSendRateLimit = pushSendRateLimit;
exports.adminRateLimit = adminRateLimit;
const express_rate_limit_1 = require("express-rate-limit");
exports.globalLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
// Backward-compatible aliases for existing imports.
exports.globalRateLimit = exports.globalLimiter;
exports.apiRateLimit = exports.globalLimiter;
exports.documentUploadRateLimit = exports.globalLimiter;
exports.clientSubmissionRateLimit = exports.globalLimiter;
exports.lenderSubmissionRateLimit = exports.globalLimiter;
function pushSendRateLimit() {
    return (_req, _res, next) => next();
}
function adminRateLimit() {
    return (_req, _res, next) => next();
}
const voiceRateLimit = () => exports.globalLimiter;
exports.voiceRateLimit = voiceRateLimit;
const portalRateLimit = () => exports.globalLimiter;
exports.portalRateLimit = portalRateLimit;
const clientReadRateLimit = () => exports.globalLimiter;
exports.clientReadRateLimit = clientReadRateLimit;
const clientDocumentsRateLimit = () => exports.globalLimiter;
exports.clientDocumentsRateLimit = clientDocumentsRateLimit;
exports.otpLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
