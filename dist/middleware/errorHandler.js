"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = err?.status || 500;
    if (status >= 500) {
        console.error(err);
    }
    res.status(status).json({ error: message });
}
