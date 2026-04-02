"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.buildAppWithApiRoutes = void 0;
exports.resetOtpStateForTests = resetOtpStateForTests;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = require("./middleware/cors");
const auth_1 = require("./middleware/auth");
const routeAlias_1 = require("./middleware/routeAlias");
const internal_1 = __importDefault(require("./routes/internal"));
const routes_1 = __importDefault(require("./routes"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const messaging_1 = __importDefault(require("./routes/messaging"));
const maya_1 = __importDefault(require("./routes/maya"));
const voice_1 = __importDefault(require("./routes/voice"));
const sms_1 = __importDefault(require("./routes/sms"));
const health_1 = __importDefault(require("./routes/health"));
const crm_1 = __importDefault(require("./routes/crm"));
const calls_1 = __importDefault(require("./routes/calls"));
const twilio_1 = __importDefault(require("./routes/twilio"));
const lead_1 = __importDefault(require("./routes/lead"));
const application_1 = __importDefault(require("./routes/application"));
const documents_1 = __importDefault(require("./routes/documents"));
const errorHandler_1 = require("./middleware/errorHandler");
const respond_1 = require("./utils/http/respond");
const routeWrap_1 = require("./lib/routeWrap");
const timeout_1 = require("./system/timeout");
const requestId_1 = require("./middleware/requestId");
const access_1 = require("./system/access");
const metrics_1 = require("./system/metrics");
const rateLimit_1 = require("./system/rateLimit");
const config_1 = require("./system/config");
const deps_1 = require("./system/deps");
function resetOtpStateForTests() { }
globalThis.__resetOtpStateForTests = resetOtpStateForTests;
function createApp() {
    process.env.STRICT_API = config_1.CONFIG.STRICT_API;
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, res, next) => {
        const originalJson = res.json;
        res.json = function (body) {
            if (!body || typeof body !== "object" || !("status" in body)) {
                console.error("INVALID RESPONSE SHAPE:", body);
            }
            return originalJson.call(this, body);
        };
        next();
    });
    app.use(requestId_1.requestId);
    app.use((0, access_1.access)());
    app.use((req, _res, next) => {
        (0, metrics_1.incReq)();
        next();
    });
    app.use((0, timeout_1.timeout)(config_1.CONFIG.REQUEST_TIMEOUT_MS));
    app.use((0, rateLimit_1.rateLimit)());
    app.use(cors_1.corsMiddleware);
    app.use((req, res, next) => {
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            const body = req.body;
            if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
                res.locals.__wrapped = true;
                return (0, respond_1.fail)(res, "Invalid request body", 400, "INVALID_REQUEST_BODY");
            }
        }
        return next();
    });
    app.use((req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        next();
    });
    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });
    app.get("/ready", (_req, res) => {
        if (!deps_1.deps.db.ready) {
            return res.status(503).json({ status: "not_ready" });
        }
        res.json({ status: "ok" });
    });
    app.get("/metrics", (req, res) => {
        res.json({
            status: "ok",
            rid: req.rid,
            data: {
                requests: (0, metrics_1.metrics)().requests,
                errors: (0, metrics_1.metrics)().errors,
            },
        });
    });
    app.use(routeAlias_1.routeAlias);
    app.use("/api/v1", routes_1.default);
    app.get("/api/v1/public/test", (0, routeWrap_1.wrap)(async (_req, _res) => {
        return { ok: true };
    }));
    app.use("/api/v1/auth", auth_routes_1.default);
    app.use("/api/v1/crm", crm_1.default);
    app.use("/api/v1/crm", lead_1.default);
    app.use("/api/v1/application", application_1.default);
    app.use("/api/v1/documents", documents_1.default);
    app.use("/", twilio_1.default);
    app.use("/api/v1/maya", maya_1.default);
    app.use("/api/v1/voice", voice_1.default);
    app.use("/api/v1/call", calls_1.default);
    app.use("/api/v1", twilio_1.default);
    app.use("/api/v1/comm", messaging_1.default);
    app.use("/api/v1/sms", sms_1.default);
    app.use("/api/v1", health_1.default);
    app.get("/api/v1/voice/token", auth_1.requireAuth, (0, routeWrap_1.wrap)(async () => {
        return { token: "real-token" };
    }));
    app.use("/api/v1/private", auth_1.requireAuth, (0, routeWrap_1.wrap)(async () => {
        return { ok: true };
    }));
    app.use("/api/v1/internal", internal_1.default);
    app.use((req, res) => {
        if (!res.headersSent && !res.locals.__wrapped) {
            return (0, respond_1.fail)(res, "Unwrapped response", 500, "UNWRAPPED_RESPONSE");
        }
        return undefined;
    });
    app.use((_req, res) => {
        if (!res.headersSent) {
            return (0, respond_1.fail)(res, "Route not found", 404, "NOT_FOUND");
        }
        return undefined;
    });
    app.use(errorHandler_1.errorHandler);
    return app;
}
exports.buildAppWithApiRoutes = createApp;
exports.app = createApp();
exports.default = exports.app;
