"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collectionSafe_1 = require("../utils/collectionSafe");
const express_1 = require("express");
const retry_1 = require("../utils/retry");
const supportService_1 = require("../services/supportService");
const db_1 = require("../db");
const twilio_1 = require("../services/twilio");
const crmWebhook_1 = require("../services/crmWebhook");
const support_controller_1 = require("../modules/support/support.controller");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const tableColumnCache = new Map();
async function getTableColumns(table) {
    const cached = tableColumnCache.get(table);
    if (cached) {
        return cached;
    }
    const { rows } = await (0, db_1.dbQuery)(`select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`, [table]);
    const columns = (0, collectionSafe_1.toStringSet)(rows.map((row) => row.column_name));
    tableColumnCache.set(table, columns);
    return columns;
}
router.post("/live", async (req, res, next) => {
    const { source, sessionId } = req.body;
    if (!source || !sessionId) {
        return res.status(400).json({ error: "Missing source or sessionId" });
    }
    await (0, db_1.dbQuery)(`insert into live_chat_requests (source, session_id, status)
     values ($1, $2, 'pending')`, [source, sessionId]);
    return res.json({ success: true });
});
router.get("/live", async (_req, res) => {
    const { rows } = await (0, db_1.dbQuery)(`select id, source, session_id, status, created_at
     from live_chat_requests
     where status = 'pending'
     order by created_at desc`);
    res.json(rows);
});
router.get("/live/count", async (_req, res) => {
    const { rows } = await (0, db_1.dbQuery)(`select count(*)::text as count
     from live_chat_requests
     where status = 'pending'`);
    res.json({ count: Number(rows[0]?.count ?? "0") });
});
router.post("/human", async (req, res, next) => {
    const { message, user } = req.body;
    await (0, retry_1.withRetry)(async () => {
        await (0, supportService_1.createSupportThread)({
            type: "chat_escalation",
            description: message ?? "Human support request",
            source: user ?? "unknown",
        });
    });
    logger_1.logger.info("human_chat_request", { message });
    res.json({ success: true });
});
router.post("/report", async (req, res, next) => {
    const { message, description, screenshot, route } = req.body;
    const resolvedDescription = description ?? message;
    const columns = await getTableColumns("issue_reports");
    const insertColumns = [];
    const placeholderParts = [];
    const values = [];
    if (columns.has("id")) {
        insertColumns.push("id");
        placeholderParts.push("gen_random_uuid()");
    }
    const pushValue = (column, value) => {
        if (!columns.has(column)) {
            return;
        }
        insertColumns.push(column);
        values.push(value);
        placeholderParts.push(`$${values.length}`);
    };
    pushValue("description", resolvedDescription ?? "Issue reported");
    pushValue("screenshot_base64", screenshot ?? null);
    pushValue("user_agent", req.headers["user-agent"] ?? "unknown");
    pushValue("page_url", route ?? "unknown");
    pushValue("browser_info", req.headers["user-agent"] ?? "unknown");
    pushValue("screenshot_path", screenshot ?? null);
    pushValue("status", "open");
    if (insertColumns.length === 0) {
        await (0, db_1.dbQuery)("insert into issue_reports default values");
    }
    else {
        await (0, db_1.dbQuery)(`insert into issue_reports (${insertColumns.join(", ")}) values (${placeholderParts.join(", ")})`, values);
    }
    await (0, retry_1.withRetry)(async () => {
        await (0, supportService_1.createSupportThread)({
            type: "issue_report",
            ...(resolvedDescription ? { description: resolvedDescription } : {}),
            ...(screenshot ? { screenshotBase64: screenshot } : {}),
            ...(route ? { route } : {}),
        });
    });
    logger_1.logger.info("issue_reported", { description: resolvedDescription ?? null });
    res.json({ success: true });
});
router.post("/contact", async (req, res, next) => {
    const { company, firstName, lastName, email, phone } = req.body;
    if (!company || !firstName || !lastName || !email || !phone) {
        return res.status(400).json({ error: "Missing fields" });
    }
    await (0, db_1.dbQuery)(`insert into contact_leads (company, first_name, last_name, email, phone)
     values ($1, $2, $3, $4, $5)`, [company, firstName, lastName, email, phone]);
    const client = (0, twilio_1.getTwilioClient)();
    await (0, retry_1.retry)(async () => client.messages.create({
        body: `New Contact: ${company} - ${firstName} ${lastName} - ${phone}`,
        from: process.env.TWILIO_PHONE,
        to: "+15878881837",
    }));
    await (0, crmWebhook_1.pushLeadToCRM)({
        type: "contact_form",
        company,
        firstName,
        lastName,
        email,
        phone,
    });
    return res.json({ success: true });
});
router.post("/track", async (req, res, next) => {
    const { event, metadata } = req.body;
    logger_1.logger.info("support_track_event", { event: event ?? null, metadata: metadata ?? null });
    return res.json({ success: true });
});
router.post("/session", support_controller_1.SupportController.createSession);
router.get("/queue", support_controller_1.SupportController.getQueue);
router.post("/issue", support_controller_1.SupportController.createIssue);
router.get("/issues", support_controller_1.SupportController.getIssues);
router.post("/event", support_controller_1.SupportController.trackEvent);
router.get("/events", support_controller_1.SupportController.getEvents);
exports.default = router;
