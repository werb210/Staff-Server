"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApi = buildApi;
const routeAudit_1 = require("./_internal/routeAudit");
const express_1 = __importDefault(require("express"));
const routeRegistry_1 = require("./routes/routeRegistry");
function buildApi() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // HEALTH
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.get("/_int/routes", (req, res) => {
        const { auditRoutes } = require("./_internal/routeAudit");
        res.json(auditRoutes(app));
    });
    // ROUTES (ONLY SOURCE OF TRUTH)
    (0, routeRegistry_1.registerApiRouteMounts)(app);
    (0, routeAudit_1.assertCriticalRoutes)(app);
    // FALLBACK
    app.use((req, res) => {
        res.status(404).json({ error: "not_found", path: req.path });
    });
    return app;
}
exports.default = buildApi;
