"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.forbiddenError = forbiddenError;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
class AppError extends Error {
    status;
    code;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
exports.AppError = AppError;
function forbiddenError() {
    return new AppError("forbidden", "Access denied.", 403);
}
function errorHandler(err, _req, res, _next) {
    const requestId = res.locals.requestId ?? "unknown";
    if (err instanceof AppError) {
        res.status(err.status).json({
            code: err.code,
            message: err.message,
            requestId,
        });
        return;
    }
    console.error("request_error", {
        requestId,
        message: err.message,
        stack: err.stack,
    });
    res.status(500).json({
        code: "server_error",
        message: "An unexpected error occurred.",
        requestId,
    });
}
function notFoundHandler(_req, res) {
    const requestId = res.locals.requestId ?? "unknown";
    res.status(404).json({
        code: "not_found",
        message: "Route not found.",
        requestId,
    });
}
