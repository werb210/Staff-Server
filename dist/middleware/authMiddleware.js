"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const requireAuth_1 = require("./requireAuth");
function authenticate(req, res, next) {
    return (0, requireAuth_1.requireAuth)(req, res, next);
}
