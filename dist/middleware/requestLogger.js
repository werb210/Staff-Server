"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const durationMs = Date.now() - start;
        const requestId = res.locals.requestId ?? "unknown";
        const ip = req.ip ?? "unknown";
        console.info("request_completed", {
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            ip,
            durationMs,
        });
    });
    next();
}
