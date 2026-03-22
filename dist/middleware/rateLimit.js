"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpVerifyLimiter = exports.otpSendLimiter = exports.pushSendRateLimit = exports.clientDocumentsRateLimit = exports.clientReadRateLimit = exports.lenderSubmissionRateLimit = exports.clientSubmissionRateLimit = exports.documentUploadRateLimit = exports.refreshRateLimit = exports.verifyOtpRateLimit = exports.otpRateLimit = exports.loginRateLimit = exports.voiceRateLimit = exports.portalRateLimit = exports.adminRateLimit = exports.strictLimiter = exports.publicLimiter = exports.apiLimiter = void 0;
exports.resetOtpRateLimit = resetOtpRateLimit;
exports.resetLoginRateLimit = resetLoginRateLimit;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
const oneMinute = 60 * 1000;
function isEnabled() {
    if (process.env.NODE_ENV === "production") {
        return true;
    }
    return process.env.RATE_LIMIT_ENABLED !== "false";
}
function makeLimiter(max, windowMs = oneMinute) {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => !isEnabled() || process.env.NODE_ENV === "test",
        keyGenerator: (req) => (0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? ""),
    });
}
const loginLimiter = makeLimiter(20);
const otpLimiter = makeLimiter(5, 15 * 60 * 1000);
const verifyOtpLimiter = makeLimiter(10, 15 * 60 * 1000);
exports.apiLimiter = makeLimiter(200, 15 * 60 * 1000);
exports.publicLimiter = makeLimiter(200, 15 * 60 * 1000);
exports.strictLimiter = makeLimiter(25, 15 * 60 * 1000);
const adminRateLimit = (max = 120, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.adminRateLimit = adminRateLimit;
const portalRateLimit = (max = 120, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.portalRateLimit = portalRateLimit;
const voiceRateLimit = (max = 60, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.voiceRateLimit = voiceRateLimit;
const loginRateLimit = () => loginLimiter;
exports.loginRateLimit = loginRateLimit;
const otpRateLimit = () => otpLimiter;
exports.otpRateLimit = otpRateLimit;
const verifyOtpRateLimit = () => verifyOtpLimiter;
exports.verifyOtpRateLimit = verifyOtpRateLimit;
function resetOtpRateLimit(key) {
    if (!key) {
        otpLimiter.resetKey?.("::/0");
        return;
    }
    otpLimiter.resetKey?.(key);
}
const refreshRateLimit = (max = 30, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.refreshRateLimit = refreshRateLimit;
const documentUploadRateLimit = (max = 30, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.documentUploadRateLimit = documentUploadRateLimit;
const clientSubmissionRateLimit = (max = 40, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.clientSubmissionRateLimit = clientSubmissionRateLimit;
const lenderSubmissionRateLimit = (max = 40, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.lenderSubmissionRateLimit = lenderSubmissionRateLimit;
const clientReadRateLimit = (max = 120, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.clientReadRateLimit = clientReadRateLimit;
const clientDocumentsRateLimit = (max = 40, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.clientDocumentsRateLimit = clientDocumentsRateLimit;
const pushSendRateLimit = (max = 30, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.pushSendRateLimit = pushSendRateLimit;
const otpSendLimiter = (max = 5, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.otpSendLimiter = otpSendLimiter;
const otpVerifyLimiter = (max = 20, windowMs = oneMinute) => makeLimiter(max, windowMs);
exports.otpVerifyLimiter = otpVerifyLimiter;
function resetLoginRateLimit(key) {
    if (!key) {
        loginLimiter.resetKey?.("::/0");
        return;
    }
    loginLimiter.resetKey?.(key);
}
