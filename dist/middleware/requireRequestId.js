"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRequestId = requireRequestId;
const errors_1 = require("./errors");
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
function requireRequestId(req, _res, next) {
    if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
        next();
        return;
    }
    const headerId = req.get("x-request-id");
    if (!headerId || headerId.trim().length === 0) {
        next(new errors_1.AppError("missing_request_id", "x-request-id header is required for mutations.", 400));
        return;
    }
    next();
}
