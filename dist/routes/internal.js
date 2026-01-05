"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const config_1 = require("../config");
const migrations_1 = require("../migrations");
const ops_service_1 = require("../modules/ops/ops.service");
const replay_service_1 = require("../modules/ops/replay.service");
const export_service_1 = require("../modules/exports/export.service");
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
router.get("/ready", async (_req, res) => {
    try {
        (0, config_1.assertEnv)();
        await (0, db_1.checkDb)();
        res.json({ ok: true });
    }
    catch (err) {
        const requestId = res.locals.requestId ?? "unknown";
        const reason = err instanceof Error && err.message
            ? ` Service not ready: ${err.message}`
            : " Service not ready.";
        res.status(503).json({
            code: "service_unavailable",
            message: reason.trim(),
            requestId,
        });
    }
});
router.get("/version", async (_req, res) => {
    try {
        const { commitHash, buildTimestamp } = (0, config_1.getBuildInfo)();
        const schemaVersion = await (0, migrations_1.getSchemaVersion)();
        res.json({ commitHash, buildTimestamp, schemaVersion });
    }
    catch {
        const requestId = res.locals.requestId ?? "unknown";
        res.status(503).json({
            code: "service_unavailable",
            message: "Version information unavailable.",
            requestId,
        });
    }
});
router.get("/ops", async (_req, res) => {
    const switches = await (0, ops_service_1.listKillSwitches)();
    res.json({ switches });
});
router.get("/jobs", async (_req, res) => {
    const jobs = await (0, replay_service_1.listActiveReplayJobs)();
    res.json({ jobs });
});
router.get("/exports/recent", async (_req, res) => {
    const exports = await (0, export_service_1.listRecentExports)();
    res.json({ exports });
});
exports.default = router;
