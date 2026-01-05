"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../../middleware/errors");
const auth_service_1 = require("../auth/auth.service");
const users_service_1 = require("./users.service");
const roles_1 = require("../../auth/roles");
const capabilities_1 = require("../../auth/capabilities");
const router = (0, express_1.Router)();
router.post("/", async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            throw new errors_1.AppError("missing_fields", "Email, password, and role are required.", 400);
        }
        if (typeof role !== "string" || !(0, roles_1.isRole)(role)) {
            throw new errors_1.AppError("invalid_role", "Role is invalid.", 400);
        }
        const user = await (0, auth_service_1.createUserAccount)({
            email,
            password,
            role,
            actorUserId: req.user?.userId ?? null,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.status(201).json({ user });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/role", async (req, res, next) => {
    try {
        const actorId = req.user?.userId;
        if (!actorId) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const { role } = req.body ?? {};
        if (typeof role !== "string" || !(0, roles_1.isRole)(role)) {
            throw new errors_1.AppError("invalid_role", "Role is invalid.", 400);
        }
        await (0, users_service_1.changeUserRole)({
            userId: req.params.id,
            role,
            actorId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/disable", async (req, res, next) => {
    try {
        const actorId = req.user?.userId;
        if (!actorId) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, users_service_1.setUserStatus)({
            userId: req.params.id,
            active: false,
            actorId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/enable", async (req, res, next) => {
    try {
        const actorId = req.user?.userId;
        if (!actorId) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        await (0, users_service_1.setUserStatus)({
            userId: req.params.id,
            active: true,
            actorId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/force-password-reset", async (req, res, next) => {
    try {
        const actorId = req.user?.userId;
        if (!actorId) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        const token = await (0, auth_service_1.requestPasswordReset)({
            userId: req.params.id,
            actorUserId: actorId,
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
        res.json({ token });
    }
    catch (err) {
        next(err);
    }
});
router.post("/:id/unlock", async (req, res, next) => {
    try {
        const actorId = req.user?.userId;
        if (!actorId) {
            throw new errors_1.AppError("missing_token", "Authorization token is required.", 401);
        }
        if (!req.user?.capabilities.includes(capabilities_1.CAPABILITIES.ACCOUNT_UNLOCK)) {
            throw new errors_1.AppError("forbidden", "Admin access required.", 403);
        }
        await (0, auth_service_1.unlockUserAccount)({
            userId: req.params.id,
            actorUserId: actorId,
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
