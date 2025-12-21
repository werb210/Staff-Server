"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const listRoutes_1 = require("../routes/listRoutes");
const db_2 = require("../db");
const schema_1 = require("../db/schema");
const password_service_1 = require("../services/password.service");
const router = (0, express_1.Router)();
/**
 * GET /api/internal/health
 */
router.get("/health", async (_req, res) => {
    try {
        const dbConnected = await (0, db_1.verifyDatabaseConnection)();
        const status = dbConnected ? "ok" : "degraded";
        const httpStatus = dbConnected ? 200 : 503;
        res.status(httpStatus).json({
            status,
            dbConnected,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            service: "staff-server",
            scope: "internal",
        });
    }
    catch (err) {
        res.status(500).json({
            status: "error",
            dbConnected: false,
            message: err?.message ?? "Health check failed",
            timestamp: new Date().toISOString(),
            service: "staff-server",
            scope: "internal",
        });
    }
});
/**
 * GET /api/internal/routes
 * Returns a best-effort list of registered routes.
 */
router.get("/routes", (req, res) => {
    try {
        const routes = (0, listRoutes_1.listRegisteredRoutes)(req.app, "");
        res.status(200).json({ status: "ok", routes });
    }
    catch (err) {
        res.status(500).json({
            status: "error",
            message: err?.message || "Failed to enumerate routes",
        });
    }
});
/**
 * POST /api/internal/admin/reset-password
 */
router.post("/admin/reset-password", async (req, res) => {
    const providedToken = req.header("x-admin-reset-token");
    const expectedToken = process.env.ADMIN_RESET_TOKEN;
    if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const newPassword = String(req.body?.newPassword ?? "");
    if (!email || !newPassword) {
        return res.status(400).json({ error: "Email and newPassword are required" });
    }
    const user = await db_2.db.query.users.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
    });
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    const hashedPassword = await password_service_1.passwordService.hashPassword(newPassword);
    await db_2.db
        .update(schema_1.users)
        .set({ password_hash: hashedPassword })
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
    return res.status(200).json({ ok: true });
});
exports.default = router;
