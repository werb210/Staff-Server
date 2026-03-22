"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
const requestContext_1 = require("../middleware/requestContext");
function buildPayload(level, event, fields = {}) {
    const requestId = fields.requestId ?? (0, requestContext_1.getRequestId)() ?? "unknown";
    const route = fields.route ?? (0, requestContext_1.getRequestRoute)() ?? "unknown";
    const durationMs = fields.durationMs ?? 0;
    const { requestId: _req, route: _route, durationMs: _duration, ...rest } = fields;
    return {
        timestamp: new Date().toISOString(),
        level,
        event,
        requestId,
        route,
        durationMs,
        ...rest,
    };
}
function writeLog(level, event, fields) {
    if (process.env.NODE_ENV === "test" && process.env.TEST_LOGGING !== "true") {
        return;
    }
    try {
        const payload = buildPayload(level, event, fields);
        const output = JSON.stringify(payload);
        switch (level) {
            case "error":
                process.stderr.write(`${output}\n`);
                break;
            case "warn":
            default:
                process.stdout.write(`${output}\n`);
                break;
        }
    }
    catch {
        // Swallow logging errors to avoid crashing tests or runtime paths.
    }
}
function logInfo(event, fields) {
    writeLog("info", event, fields);
}
function logWarn(event, fields) {
    writeLog("warn", event, fields);
}
function logError(event, fields) {
    writeLog("error", event, fields);
}
