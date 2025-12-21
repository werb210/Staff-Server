"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const notifications_service_1 = require("./notifications.service");
const router = (0, express_1.Router)();
const notificationsService = new notifications_service_1.NotificationsService();
router.use(requireAuth_1.requireAuth);
router.get("/", async (req, res, next) => {
    try {
        const userId = req.user.id;
        const items = await notificationsService.listForUser(userId);
        res.json({ ok: true, notifications: items });
    }
    catch (err) {
        next(err);
    }
});
router.post("/mark-read", async (req, res, next) => {
    try {
        const userId = req.user.id;
        await notificationsService.markAllRead(userId);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
