"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
const crypto_1 = require("crypto");
function requestId(req, res, next) {
    req.id = String(req.headers["x-request-id"] || (0, crypto_1.randomUUID)());
    res.setHeader("X-Request-Id", req.id);
    next();
}
