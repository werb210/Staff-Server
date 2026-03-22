"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
exports.requireAuthorization = requireAuthorization;
exports.requireCapability = requireCapability;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const capabilities_1 = require("../auth/capabilities");
const jwt_1 = require("../auth/jwt");
const silo_1 = require("../auth/silo");
const roles_1 = require("../auth/roles");
function resolveRequestId(req) {
    return req.id ?? "unknown";
}
function authErrorBody(req, code, message) {
    return {
        success: false,
        code,
        message,
        requestId: resolveRequestId(req),
    };
}
const requireAuth = (req, res, next) => {
    req.id = String(req.id);
    const token = resolveToken(req);
    if (!token) {
        req.log?.warn({
            event: "auth_missing_token",
            path: req.originalUrl,
            ip: req.ip,
        });
        return res.status(401).json(authErrorBody(req, "missing_token", "Missing token"));
    }
    try {
        const decoded = verifyJwtPayload(token);
        const user = resolveAuthenticatedUser(decoded);
        if (!user) {
            return res.status(401).json(authErrorBody(req, "invalid_token", "Invalid token"));
        }
        (req).user = user;
        next();
    }
    catch {
        return res.status(401).json(authErrorBody(req, "invalid_token", "Invalid token"));
    }
};
exports.requireAuth = requireAuth;
function verifyJwtPayload(token) {
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        return payload;
    }
    catch {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"],
        });
        if (!decoded || typeof decoded !== "object") {
            throw new Error("invalid_token");
        }
        return decoded;
    }
}
function resolveToken(req) {
    const header = req.headers.authorization;
    if (typeof header === "string") {
        const [scheme, rawToken] = header.split(/\s+/, 2);
        if (scheme?.toLowerCase() === "bearer" && rawToken) {
            return rawToken;
        }
    }
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        return null;
    }
    const cookieEntries = cookieHeader.split(";");
    const cookieNames = ["token", "accessToken", "session"];
    for (const entry of cookieEntries) {
        const [rawName, ...rawValue] = entry.trim().split("=");
        if (!rawName || rawValue.length === 0) {
            continue;
        }
        if (!cookieNames.includes(rawName)) {
            continue;
        }
        const value = rawValue.join("=").trim();
        if (!value) {
            continue;
        }
        try {
            return decodeURIComponent(value);
        }
        catch {
            return value;
        }
    }
    return null;
}
function resolveAuthenticatedUser(decoded) {
    if (!decoded || typeof decoded !== "object") {
        return null;
    }
    const userId = typeof decoded.sub === "string" ? decoded.sub : null;
    const role = typeof decoded.role === "string" && (0, roles_1.isRole)(decoded.role) ? decoded.role : null;
    if (!userId || !role) {
        return null;
    }
    const silo = typeof decoded.silo === "string" && decoded.silo.trim().length > 0
        ? decoded.silo.trim()
        : silo_1.DEFAULT_AUTH_SILO;
    return {
        userId,
        role,
        silo,
        siloFromToken: typeof decoded.silo === "string" && decoded.silo.trim().length > 0,
        lenderId: null,
        phone: typeof decoded.phone === "string" ? decoded.phone : null,
        capabilities: (0, capabilities_1.getCapabilitiesForRole)(role),
    };
}
function requireAuthorization(options = {}) {
    const requiredRoles = options.roles ?? [];
    const requiredCapabilities = options.capabilities ?? [];
    return (req, res, next) => {
        const user = (req).user;
        if (!user) {
            return res.status(401).json(authErrorBody(req, "missing_token", "Missing token"));
        }
        if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
            return res.status(403).json(authErrorBody(req, "forbidden", "Forbidden"));
        }
        if (requiredCapabilities.length > 0) {
            const userCapabilities = user.capabilities || [];
            const allowed = requiredCapabilities.some((capability) => userCapabilities.includes(capability));
            if (!allowed) {
                return res.status(403).json(authErrorBody(req, "forbidden", "Forbidden"));
            }
        }
        next();
    };
}
function requireCapability(cap) {
    const required = Array.isArray(cap) ? cap : [cap];
    return (req, res, next) => {
        const user = (req).user;
        if (!user) {
            return res.status(401).json(authErrorBody(req, "missing_token", "Missing token"));
        }
        const userCaps = user.capabilities || [];
        const allowed = required.some((c) => userCaps.includes(c));
        if (!allowed) {
            return res.status(403).json(authErrorBody(req, "forbidden", "Forbidden"));
        }
        next();
    };
}
