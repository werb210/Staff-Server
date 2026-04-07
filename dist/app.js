"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = void 0;
exports.createApp = createApp;
exports.resetOtpStateForTests = resetOtpStateForTests;
const express_1 = __importDefault(require("express"));
const cors_1 = require("./middleware/cors");
const auth_1 = __importDefault(require("./routes/auth"));
const routes_1 = __importDefault(require("./routes"));
const routeRegistry_1 = require("./routes/routeRegistry");
const core_1 = require("./middleware/core");
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(core_1.coreMiddleware);
    // secure CORS (allowlist)
    app.use(cors_1.corsMiddleware);
    // auth routes (OTP, JWT, Twilio)
    app.use("/api/auth", auth_1.default);
    // primary API routes
    app.use("/api/v1", routes_1.default);
    // dynamic route registry (contracts)
    (0, routeRegistry_1.registerApiRouteMounts)(app);
    return app;
}
function resetOtpStateForTests() {
    // No module-scope OTP state is used by this app.
}
exports.buildApp = createApp;
