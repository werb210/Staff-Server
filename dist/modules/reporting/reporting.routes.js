"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errors_1 = require("../../middleware/errors");
const auth_1 = require("../../middleware/auth");
const capabilities_1 = require("../../auth/capabilities");
const audit_service_1 = require("../audit/audit.service");
const dailyMetrics_service_1 = require("./dailyMetrics.service");
const pipelineSnapshot_service_1 = require("./pipelineSnapshot.service");
const lenderPerformance_service_1 = require("./lenderPerformance.service");
const applicationVolume_service_1 = require("./applicationVolume.service");
const documentMetrics_service_1 = require("./documentMetrics.service");
const staffActivity_service_1 = require("./staffActivity.service");
const lenderFunnel_service_1 = require("./lenderFunnel.service");
const db_1 = require("../../db");
const router = (0, express_1.Router)();
const GROUP_BY_VALUES = ["day", "week", "month"];
function parseGroupBy(value) {
    if (typeof value === "string" && GROUP_BY_VALUES.includes(value)) {
        return value;
    }
    return "day";
}
function parseDate(value, label) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (typeof value !== "string") {
        throw new errors_1.AppError("invalid_range", `Invalid ${label} timestamp.`, 400);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new errors_1.AppError("invalid_range", `Invalid ${label} timestamp.`, 400);
    }
    return parsed;
}
function parseLimit(value) {
    if (value === undefined) {
        return 50;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new errors_1.AppError("invalid_pagination", "Invalid limit.", 400);
    }
    return Math.min(200, Math.max(1, parsed));
}
function parseOffset(value) {
    if (value === undefined) {
        return 0;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new errors_1.AppError("invalid_pagination", "Invalid offset.", 400);
    }
    return Math.max(0, parsed);
}
function assertRange(from, to) {
    if (from && to && from > to) {
        throw new errors_1.AppError("invalid_range", "from must be before to.", 400);
    }
}
router.use(auth_1.requireAuth);
router.use((0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.REPORT_VIEW]));
router.get("/overview", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const metrics = await (0, dailyMetrics_service_1.listDailyMetrics)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "report",
            targetId: "overview",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/pipeline", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const snapshots = await (0, pipelineSnapshot_service_1.listPipelineSnapshots)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
        });
        const currentState = await (0, pipelineSnapshot_service_1.listCurrentPipelineState)();
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "report",
            targetId: "pipeline",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ currentState, snapshots, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/pipeline/summary", async (req, res, next) => {
    try {
        const currentState = await (0, pipelineSnapshot_service_1.listCurrentPipelineState)();
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "reporting",
            targetId: "pipeline_summary",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ currentState });
    }
    catch (err) {
        next(err);
    }
});
router.get("/pipeline/timeseries", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset, pipelineState } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const snapshots = await (0, pipelineSnapshot_service_1.listPipelineSnapshots)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
            pipelineState: typeof pipelineState === "string" ? pipelineState : null,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "reporting",
            targetId: "pipeline_timeseries",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ snapshots, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/lenders/performance", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset, lenderId } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const performance = await (0, lenderPerformance_service_1.listLenderPerformance)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
            lenderId: typeof lenderId === "string" ? lenderId : null,
        });
        const funnel = await (0, lenderFunnel_service_1.listLenderFunnel)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
            lenderId: typeof lenderId === "string" ? lenderId : null,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "reporting",
            targetId: "lender_performance",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ performance, funnel, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/applications/volume", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset, productType } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const metrics = await (0, applicationVolume_service_1.listApplicationVolume)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
            productType: typeof productType === "string" ? productType : null,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "reporting",
            targetId: "application_volume",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/documents/metrics", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset, documentType } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const metrics = await (0, documentMetrics_service_1.listDocumentMetrics)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
            documentType: typeof documentType === "string" ? documentType : null,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "reporting",
            targetId: "document_metrics",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/staff/activity", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset, staffUserId, action } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const metrics = await (0, staffActivity_service_1.listStaffActivity)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
            staffUserId: typeof staffUserId === "string" ? staffUserId : null,
            action: typeof action === "string" ? action : null,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "reporting",
            targetId: "staff_activity",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
    }
    catch (err) {
        next(err);
    }
});
router.get("/conversion", async (req, res, next) => {
    try {
        const result = await db_1.pool.query(`select applications_created, applications_submitted, applications_approved, applications_funded
       from vw_application_conversion_funnel`);
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "report",
            targetId: "conversion",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ funnel: result.rows[0] ?? null });
    }
    catch (err) {
        next(err);
    }
});
router.get("/documents", async (req, res, next) => {
    try {
        const result = await db_1.pool.query(`select documents_uploaded, documents_reviewed, documents_approved, approval_rate
       from vw_document_processing_stats`);
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "report",
            targetId: "documents",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({ documents: result.rows[0] ?? null });
    }
    catch (err) {
        next(err);
    }
});
router.get("/lenders", async (req, res, next) => {
    try {
        const { from, to, groupBy, limit, offset } = req.query ?? {};
        const parsedFrom = parseDate(from, "from");
        const parsedTo = parseDate(to, "to");
        assertRange(parsedFrom, parsedTo);
        const parsedLimit = parseLimit(limit);
        const parsedOffset = parseOffset(offset);
        const performance = await (0, lenderPerformance_service_1.listLenderPerformance)({
            from: parsedFrom,
            to: parsedTo,
            groupBy: parseGroupBy(groupBy),
            limit: parsedLimit,
            offset: parsedOffset,
        });
        const conversions = await db_1.pool.query(`select lender_id, submissions, approvals, declines, funded, approval_rate, funding_rate
       from vw_lender_conversion
       order by lender_id
       limit $1 offset $2`, [parsedLimit, parsedOffset]);
        await (0, audit_service_1.recordAuditEvent)({
            action: "REPORT_VIEW",
            actorUserId: req.user?.userId ?? null,
            targetUserId: null,
            targetType: "report",
            targetId: "lenders",
            ip: req.ip,
            userAgent: req.get("user-agent"),
            success: true,
        });
        res.json({
            performance,
            conversions: conversions.rows,
            limit: parsedLimit,
            offset: parsedOffset,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
