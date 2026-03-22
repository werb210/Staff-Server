"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const crypto_1 = require("crypto");
const appInsights_1 = require("../services/appInsights");
function requestLogger(req, res, next) {
    const start = Date.now();
    const requestId = (0, crypto_1.randomUUID)();
    req.request_id = requestId;
    res.setHeader("x-request-id", requestId);
    console.log(`➡️  ${req.method} ${req.originalUrl}`);
    appInsights_1.appInsights.trackRequest({
        request_id: requestId,
        method: req.method,
        path: req.path,
    });
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`⬅️  ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
        appInsights_1.appInsights.trackDependency({
            request_id: requestId,
            status: res.statusCode,
        });
    });
    next();
}
