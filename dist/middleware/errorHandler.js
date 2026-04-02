"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const respond_1 = require("../utils/http/respond");
function errorHandler(err, _req, res, _next) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return (0, respond_1.fail)(res, message, 500, "INTERNAL_ERROR", err);
}
