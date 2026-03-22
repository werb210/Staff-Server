"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeHandler = safeHandler;
const errors_1 = require("./errors");
const dbRuntime_1 = require("../dbRuntime");
const logger_1 = require("../observability/logger");
const requestContext_1 = require("../observability/requestContext");
function safeHandler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        }
        catch (err) {
            // If response already started, never interfere
            if (res.headersSent) {
                next(err);
                return;
            }
            const requestId = res.locals.requestId ?? "unknown";
            const requestContext = (0, requestContext_1.getRequestContext)();
            const shouldLogStack = requestContext?.sqlTraceEnabled ?? false;
            (0, logger_1.logError)("safe_handler_error", {
                requestId,
                route: req.originalUrl,
                userId: req.user?.userId ?? null,
                error: err instanceof Error
                    ? { name: err.name, message: err.message }
                    : "unknown_error",
                ...(shouldLogStack && err instanceof Error ? { stack: err.stack } : {}),
            });
            // Let canonical error handlers deal with known error types
            if ((0, errors_1.isAppError)(err) || (0, dbRuntime_1.isDbConnectionFailure)(err)) {
                next(err);
                return;
            }
            // Delegate all other failures to the centralized error middleware.
            next(err);
        }
    };
}
