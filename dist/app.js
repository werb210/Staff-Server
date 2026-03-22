"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.buildApp = buildApp;
exports.createApp = createApp;
exports.registerApiRoutes = registerApiRoutes;
exports.assertCorsConfig = assertCorsConfig;
exports.buildAppWithApiRoutes = buildAppWithApiRoutes;
const express_1 = __importDefault(require("express"));
const routeRegistry_1 = require("./routes/routeRegistry");
const requestLogger_1 = require("./middleware/requestLogger");
function buildApp() {
    const app = (0, express_1.default)();
    app.use(requestLogger_1.requestLogger);
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    (0, routeRegistry_1.registerApiRouteMounts)(app);
    return app;
}
// ---- BACKWARD COMPAT ----
function createApp() {
    return buildApp();
}
function registerApiRoutes(app) {
    (0, routeRegistry_1.registerApiRouteMounts)(app);
}
function assertCorsConfig() {
    return true;
}
function buildAppWithApiRoutes() {
    return buildApp();
}
const app = buildApp();
exports.app = app;
exports.default = app;
