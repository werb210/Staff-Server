"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorsAllowedHeaders = getCorsAllowedHeaders;
exports.validateCorsConfig = validateCorsConfig;
const logger_1 = require("../observability/logger");
const requiredCorsHeaders = ["Authorization", "Content-Type", "Idempotency-Key"];
const requiredCorsOrigins = [
    "https://staff.boreal.financial",
    "https://client.boreal.financial",
    "https://server.boreal.financial",
];
function normalizeOrigin(origin) {
    return origin.trim().toLowerCase().replace(/\/$/, "");
}
function getCorsAllowedHeaders() {
    return ["Authorization", "Content-Type", "Idempotency-Key"];
}
function validateCorsConfig() {
    const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;
    if (!rawOrigins || rawOrigins.trim().length === 0) {
        (0, logger_1.logError)("cors_validation_failed", {
            reason: "missing_cors_allowed_origins",
        });
        return;
    }
    const origins = rawOrigins
        .split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean);
    if (origins.length === 0) {
        (0, logger_1.logError)("cors_validation_failed", {
            reason: "empty_cors_allowed_origins",
        });
        return;
    }
    const missingOrigins = requiredCorsOrigins.filter((requiredOrigin) => !origins.includes(normalizeOrigin(requiredOrigin)));
    if (missingOrigins.length > 0) {
        (0, logger_1.logError)("cors_validation_failed", {
            reason: "required_origins_missing",
            missingOrigins,
            origins,
        });
        return;
    }
    const allowedHeaders = getCorsAllowedHeaders();
    const missingHeaders = requiredCorsHeaders.filter((header) => !allowedHeaders.some((allowed) => allowed.toLowerCase() === header.toLowerCase()));
    if (missingHeaders.length > 0) {
        (0, logger_1.logError)("cors_validation_failed", {
            reason: "required_headers_missing",
            missingHeaders,
        });
        return;
    }
}
