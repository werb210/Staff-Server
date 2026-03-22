"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth)
        return res.status(401).json({ ok: false });
    const token = auth.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ?? "dev-secret");
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ ok: false });
    }
}
