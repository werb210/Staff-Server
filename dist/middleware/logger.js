"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = requestLogMiddleware;
const logger_1 = require("../server/utils/logger");
function requestLogMiddleware(req, _res, next) {
    logger_1.logger.info("request_received", {
        requestId: req.id ?? "unknown",
        method: req.method,
        path: req.originalUrl,
    });
    next();
}
