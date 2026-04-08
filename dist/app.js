"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.resetOtpStateForTests = resetOtpStateForTests;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = require("./middleware/cors");
const auth_1 = __importDefault(require("./routes/auth"));
const routes_1 = __importDefault(require("./routes"));
const routeRegistry_1 = require("./routes/routeRegistry");
function createApp() {
    const app = (0, express_1.default)();
    // core middleware
    app.use(express_1.default.json());
    app.use((0, helmet_1.default)());
    // security + cors
    app.use(cors_1.corsMiddleware);
    // base health (non-prefixed)
    app.get("/health", (_req, res) => {
        res.status(200).json({ status: "ok", data: {} });
    });
    // api health (tests expect this)
    app.get("/api/health", (_req, res) => {
        res.status(200).json({ status: "ok", data: {} });
    });
    // readiness
    app.get("/ready", (_req, res) => {
        res.status(200).json({
            status: "ok",
            data: {},
        });
    });
    // routers
    app.use("/api/auth", auth_1.default);
    app.use("/api/v1", routes_1.default);
    // CRITICAL: mounts all remaining endpoints
    (0, routeRegistry_1.registerApiRouteMounts)(app);
    // metrics (basic contract)
    app.get("/metrics", (_req, res) => {
        res.status(200).json({
            status: "ok",
            data: {
                requests: 0,
                errors: 0,
            },
        });
    });
    // legacy route handling (tests expect 410, not 404)
    app.use((req, res, next) => {
        if (req.path.startsWith("/auth") || req.path.startsWith("/api/public")) {
            return res.status(410).json({
                status: "error",
                error: "LEGACY_ROUTE_DISABLED",
            });
        }
        next();
    });
    // final 404 handler (structured)
    app.use((_req, res) => {
        res.status(404).json({
            status: "error",
            error: "NOT_FOUND",
        });
    });
    return app;
}
function resetOtpStateForTests() {
    // no-op — OTP is now handled in route layer (redis / stateless)
}
