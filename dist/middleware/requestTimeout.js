"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = requestTimeout;
const dbRuntime_1 = require("../dbRuntime");
const config_1 = require("../config");
const requestContext_1 = require("./requestContext");
const logger_1 = require("../observability/logger");
const appInsights_1 = require("../observability/appInsights");
const idempotency_1 = require("./idempotency");
function requestTimeout(req, res, next) {
    const timeoutMs = (0, config_1.getRequestTimeoutMs)();
    const requestId = res.locals.requestId ?? "unknown";
    const route = req.originalUrl;
    const idempotencyKeyHash = (0, idempotency_1.hashIdempotencyKey)(req.get("idempotency-key"));
    let fired = false;
    const timer = setTimeout(async () => {
        if (fired || res.headersSent)
            return;
        fired = true;
        const processIds = (0, requestContext_1.getRequestDbProcessIds)();
        if (processIds.length > 0) {
            await (0, dbRuntime_1.cancelDbWork)(processIds);
        }
        (0, logger_1.logWarn)("request_timeout", {
            requestId,
            route,
            durationMs: timeoutMs,
            failure_reason: "request_timeout",
        });
        (0, appInsights_1.trackEvent)({
            name: "request_timeout",
            properties: {
                route,
                requestId,
                idempotencyKeyHash,
            },
        });
        res.status(504).json({
            code: "gateway_timeout",
            message: "Request timed out.",
            requestId,
        });
        res.locals.requestTimedOut = true;
    }, timeoutMs);
    const clear = () => {
        if (!fired) {
            clearTimeout(timer);
        }
    };
    res.on("finish", clear);
    res.on("close", clear);
    next();
}
