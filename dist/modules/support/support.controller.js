"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportController = void 0;
const uuid_1 = require("uuid");
const supportSessions = [];
const issueReports = [];
const websiteEvents = [];
const webLeads = [];
exports.SupportController = {
    createSession(req, res) {
        const session = {
            id: (0, uuid_1.v4)(),
            source: req.body.source ?? "website",
            createdAt: Date.now(),
            status: "open",
        };
        supportSessions.push(session);
        res.json({ success: true, session });
    },
    getQueue(_req, res) {
        res.json({ sessions: supportSessions.filter((session) => session.status === "open") });
    },
    createIssue(req, res) {
        const payload = req.body;
        const issue = {
            id: (0, uuid_1.v4)(),
            description: payload.description,
            screenshot: payload.screenshot,
            createdAt: Date.now(),
        };
        issueReports.push(issue);
        res.json({ success: true });
    },
    getIssues(_req, res) {
        res.json({ issues: issueReports });
    },
    createWebLead(req, res) {
        const lead = {
            id: (0, uuid_1.v4)(),
            ...req.body,
            createdAt: Date.now(),
        };
        webLeads.push(lead);
        res.json({ success: true });
    },
    getWebLeads(_req, res) {
        res.json({ leads: webLeads });
    },
    trackEvent(req, res) {
        const payload = req.body;
        websiteEvents.push({
            event: payload.event,
            source: payload.source,
            timestamp: Date.now(),
        });
        res.json({ success: true });
    },
    getEvents(_req, res) {
        res.json({ events: websiteEvents.slice(-100) });
    },
};
