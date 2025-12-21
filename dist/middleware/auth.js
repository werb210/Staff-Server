"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_service_1 = require("../services/jwt.service");
const user_service_1 = require("../services/user.service");
async function requireAuth(req, res, next) {
    const publicPrefixes = ["/api/auth", "/api/health"];
    const requestPath = req.originalUrl || req.path;
    if (publicPrefixes.some((prefix) => requestPath.startsWith(prefix))) {
        return next();
    }
    const headerName = process.env.TOKEN_HEADER_NAME || "authorization";
    const authHeader = req.headers[headerName];
    if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization header" });
    }
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!bearerMatch) {
        return res.status(401).json({ error: "Authorization header must use Bearer scheme" });
    }
    const accessToken = bearerMatch[1]?.trim();
    if (!accessToken) {
        return res.status(401).json({ error: "Missing Bearer token" });
    }
    try {
        const payload = jwt_service_1.jwtService.verifyAccessToken(accessToken);
        const userRecord = await (0, user_service_1.findUserById)(payload.userId);
        const user = (0, user_service_1.mapAuthenticated)(userRecord);
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        req.user = user;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
exports.default = requireAuth;
