"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const env_1 = require("../config/env");
const response_1 = require("../lib/response");
function requireAuth(req, res, next) {
    const { JWT_SECRET } = (0, env_1.getEnv)();
    const rid = req.id ?? req.rid;
    if (!JWT_SECRET) {
        return res.status(500).json((0, response_1.error)("Auth not configured", rid));
    }
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json((0, response_1.error)("Unauthorized", rid));
    }
    return next();
}
exports.default = requireAuth;
