"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error("ERROR:", err);
    return res.status(500).json({
        success: false,
        message: "internal_error"
    });
}
