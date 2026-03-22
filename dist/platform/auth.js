"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./env");
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const token = auth.replace("Bearer ", "");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({
            success: false,
            error: "Invalid token",
        });
    }
}
