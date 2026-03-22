"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    console.error('ERROR HANDLER:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
}
