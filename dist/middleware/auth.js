"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireCapability = requireCapability;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("./errors");
const auth_repo_1 = require("../modules/auth/auth.repo");
const audit_service_1 = require("../modules/audit/audit.service");
const capabilities_1 = require("../auth/capabilities");
function parseBearer(req) {
    const header = req.headers.authorization;
    if (!header) {
        return null;
    }
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }
    return token;
}
function requireAuth(req, _res, next) {
    const token = parseBearer(req);
    if (!token) {
        next(new errors_1.AppError("missing_token", "Authorization token is required.", 401));
        return;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        next(new errors_1.AppError("auth_misconfigured", "Auth is not configured.", 503));
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        if (!payload.userId ||
            !payload.role ||
            typeof payload.tokenVersion !== "number") {
            next(new errors_1.AppError("invalid_token", "Invalid access token.", 401));
            return;
        }
        (0, auth_repo_1.findAuthUserById)(payload.userId)
            .then((user) => {
            if (!user || !user.active) {
                next(new errors_1.AppError("user_disabled", "User is disabled.", 403));
                return;
            }
            if (user.token_version !== payload.tokenVersion ||
                user.role !== payload.role) {
                next(new errors_1.AppError("invalid_token", "Invalid access token.", 401));
                return;
            }
            req.user = {
                userId: payload.userId,
                role: payload.role,
                capabilities: (0, capabilities_1.getCapabilitiesForRole)(payload.role),
            };
            next();
        })
            .catch((err) => next(err));
    }
    catch {
        next(new errors_1.AppError("invalid_token", "Invalid access token.", 401));
    }
}
function requireCapability(capabilities) {
    const allowed = capabilities;
    return async (req, _res, next) => {
        try {
            if (!allowed || allowed.length === 0) {
                await (0, audit_service_1.recordAuditEvent)({
                    action: "access_denied",
                    actorUserId: req.user?.userId ?? null,
                    targetUserId: null,
                    ip: req.ip,
                    userAgent: req.get("user-agent"),
                    success: false,
                });
                next((0, errors_1.forbiddenError)());
                return;
            }
            const userCapabilities = req.user?.capabilities ?? [];
            if (!allowed.some((capability) => userCapabilities.includes(capability))) {
                await (0, audit_service_1.recordAuditEvent)({
                    action: "access_denied",
                    actorUserId: req.user?.userId ?? null,
                    targetUserId: null,
                    ip: req.ip,
                    userAgent: req.get("user-agent"),
                    success: false,
                });
                next((0, errors_1.forbiddenError)());
                return;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
