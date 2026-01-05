"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../../middleware/errors");
const rateLimit_1 = require("../../middleware/rateLimit");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const auth_service_1 = require("./auth.service");
const router = (0, express_1.Router)();
router.post("/login", (0, rateLimit_1.loginRateLimit)(), async (req, res, next) => {
    try {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            throw new errors_1.AppError("missing_credentials", "Email and password are required.", 400);
        }
        const result = await (0, auth_service_1.loginUser)(email, password, req.ip, req.get("user-agent"));
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post("/refresh", (0, rateLimit_1.refreshRateLimit)(), async (req, res, next) => {
    try {
        const { refreshToken } = req.body ?? {};
        if (!refreshToken) {
            throw new errors_1.AppError("missing_token", "Refresh token is required.", 400);
        }
        const session = await (0, auth_service_1.refreshSession)(refreshToken, req.ip, req.get("user-agent"));
        res.json(session);
    }
    catch (err) {
        next(err);
    }
});
router.post("/logout", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.AUTH_SESSION]), async (req, res, next) => {
    try {
        const { refreshToken } = req.body ?? {};
        if (!refreshToken) {
            throw new errors_1.AppError("missing_token", "Refresh token is required.", 400);
        }
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, auth_service_1.logoutUser)({
            userId: req.user.userId,
            refreshToken,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/logout-all", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.AUTH_SESSION]), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, auth_service_1.logoutAll)({
            userId: req.user.userId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.get("/me", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.AUTH_SESSION]), async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        res.json({ user: req.user });
    }
    catch (err) {
        next(err);
    }
});
router.post("/password-reset/request", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.USER_MANAGE]), (0, rateLimit_1.passwordResetRateLimit)(), async (req, res, next) => {
    try {
        const { userId } = req.body ?? {};
        if (!userId) {
            throw new errors_1.AppError("missing_fields", "userId is required.", 400);
        }
        const token = await (0, auth_service_1.requestPasswordReset)({
            userId,
            actorUserId: req.user?.userId ?? null,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ token });
    }
    catch (err) {
        next(err);
    }
});
router.post("/password-reset/confirm", (0, rateLimit_1.passwordResetRateLimit)(), async (req, res, next) => {
    try {
        const { token, newPassword } = req.body ?? {};
        if (!token || !newPassword) {
            throw new errors_1.AppError("missing_fields", "Token and newPassword are required.", 400);
        }
        await (0, auth_service_1.confirmPasswordReset)({
            token,
            newPassword,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/password-change", auth_1.requireAuth, (0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.AUTH_SESSION]), async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body ?? {};
        if (!currentPassword || !newPassword) {
            throw new errors_1.AppError("missing_fields", "currentPassword and newPassword are required.", 400);
        }
        if (!req.user) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, auth_service_1.changePassword)({
            userId: req.user.userId,
            currentPassword,
            newPassword,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
