"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logWarn = exports.logInfo = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const requestContext_1 = require("./requestContext");
const SENSITIVE_FIELD_PATTERN = /(email|phone|ssn|password|token|secret|address)/i;
function sanitizeValue(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeValue(entry));
    }
    if (value && typeof value === "object") {
        return sanitizeObject(value);
    }
    return value;
}
function sanitizeObject(payload) {
    return Object.fromEntries(Object.entries(payload).map(([key, value]) => {
        if (SENSITIVE_FIELD_PATTERN.test(key)) {
            return [key, "[REDACTED]"];
        }
        return [key, sanitizeValue(value)];
    }));
}
const base = (0, pino_1.default)({
    level: process.env.LOG_LEVEL ?? "info",
});
exports.logger = {
    info: (msg, extra = {}) => {
        base.info({ ...sanitizeObject(extra), requestId: (0, requestContext_1.fetchRequestId)() }, msg);
    },
    warn: (msg, extra = {}) => {
        base.warn({ ...sanitizeObject(extra), requestId: (0, requestContext_1.fetchRequestId)() }, msg);
    },
    error: (msg, extra = {}) => {
        base.error({ ...sanitizeObject(extra), requestId: (0, requestContext_1.fetchRequestId)() }, msg);
    },
};
const logInfo = (message, meta = {}) => exports.logger.info(message, meta);
exports.logInfo = logInfo;
const logWarn = (message, meta = {}) => exports.logger.warn(message, meta);
exports.logWarn = logWarn;
const logError = (message, meta = {}) => exports.logger.error(message, meta);
exports.logError = logError;
