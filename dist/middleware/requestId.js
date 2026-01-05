"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = requestId;
const crypto_1 = require("crypto");
const requestContext_1 = require("./requestContext");
function requestId(req, res, next) {
    const headerId = req.get("x-request-id");
    const id = headerId && headerId.trim().length > 0 ? headerId : (0, crypto_1.randomUUID)();
    res.locals.requestId = id;
    res.setHeader("x-request-id", id);
    (0, requestContext_1.runWithRequestContext)(id, () => {
        next();
    });
}
