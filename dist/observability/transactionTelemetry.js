"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTransactionRollback = recordTransactionRollback;
const requestContext_1 = require("../middleware/requestContext");
const logger_1 = require("./logger");
const appInsights_1 = require("./appInsights");
function recordTransactionRollback(error) {
    const requestId = (0, requestContext_1.getRequestId)() ?? "unknown";
    const route = (0, requestContext_1.getRequestRoute)() ?? "unknown";
    const idempotencyKeyHash = (0, requestContext_1.getRequestIdempotencyKeyHash)() ?? "missing";
    const message = error instanceof Error ? error.message : undefined;
    (0, logger_1.logWarn)("transaction_rollback", {
        requestId,
        route,
        error: message ?? "unknown_error",
    });
    (0, appInsights_1.trackEvent)({
        name: "transaction_rollback",
        properties: {
            route,
            requestId,
            idempotencyKeyHash,
        },
    });
}
