"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.buildApp = buildApp;
exports.initializeServer = initializeServer;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const applications_1 = __importDefault(require("./routes/applications"));
const users_1 = __importDefault(require("./routes/users"));
const admin_1 = __importDefault(require("./routes/admin"));
const staff_1 = __importDefault(require("./routes/staff"));
const client_1 = __importDefault(require("./routes/client"));
const lender_1 = __importDefault(require("./routes/lender"));
const reporting_1 = __importDefault(require("./routes/reporting"));
const internal_1 = __importDefault(require("./routes/internal"));
const requestId_1 = require("./middleware/requestId");
const requireRequestId_1 = require("./middleware/requireRequestId");
const errors_1 = require("./middleware/errors");
exports.defaultConfig = {
    port: Number(process.env.PORT || 3000),
};
function buildApp(config = exports.defaultConfig) {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(requestId_1.requestId);
    app.use(requireRequestId_1.requireRequestId);
    app.get("/", (_req, res) => {
        res.status(200).json({ service: "boreal-staff-server" });
    });
    app.use("/api/_int", internal_1.default);
    app.use("/api/auth", auth_1.default);
    app.use("/api/applications", applications_1.default);
    app.use("/api/users", users_1.default);
    app.use("/api/admin", admin_1.default);
    app.use("/api/staff", staff_1.default);
    app.use("/api/client", client_1.default);
    app.use("/api/lender", lender_1.default);
    app.use("/api/reporting", reporting_1.default);
    app.use(errors_1.notFoundHandler);
    app.use(errors_1.errorHandler);
    return app;
}
async function initializeServer(config = exports.defaultConfig) {
    if (process.env.NODE_ENV === "test") {
        buildApp(config);
        return;
    }
    const app = buildApp(config);
    await new Promise((resolve, reject) => {
        const server = app.listen(config.port, () => {
            resolve();
        });
        server.on("error", reject);
    });
}
if (require.main === module) {
    initializeServer();
}
