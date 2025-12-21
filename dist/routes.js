"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const banking_routes_1 = __importDefault(require("./banking/banking.routes"));
const communications_routes_1 = __importDefault(require("./communications/communications.routes"));
const health_1 = __importDefault(require("./routes/health"));
const internal_1 = __importDefault(require("./routes/internal"));
const notifications_routes_1 = __importDefault(require("./notifications/notifications.routes"));
const public_1 = __importDefault(require("./routes/public"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const applications_routes_1 = __importDefault(require("./routes/applications.routes"));
const events_routes_1 = __importDefault(require("./routes/events.routes"));
const ocr_routes_1 = __importDefault(require("./ocr/ocr.routes"));
const tasks_routes_1 = __importDefault(require("./tasks/tasks.routes"));
const pipeline_1 = __importDefault(require("./api/pipeline"));
const auth_1 = require("./middleware/auth");
const apiRouter = (0, express_1.Router)();
apiRouter.use("/banking", banking_routes_1.default);
apiRouter.use("/communications", communications_routes_1.default);
apiRouter.use("/_int", internal_1.default);
apiRouter.get("/_int/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
apiRouter.use("/notifications", notifications_routes_1.default);
apiRouter.use("/public", public_1.default);
apiRouter.use("/users", users_routes_1.default);
apiRouter.use("/applications", applications_routes_1.default);
apiRouter.use("/events", events_routes_1.default);
apiRouter.use("/ocr", ocr_routes_1.default);
apiRouter.use("/tasks", tasks_routes_1.default);
apiRouter.use("/pipeline", pipeline_1.default);
apiRouter.use("/", health_1.default);
apiRouter.get("/", (_req, res) => {
    res.status(200).send("OK");
});
function registerRoutes(app) {
    app.use("/api/auth", auth_routes_1.default);
    app.use(auth_1.requireAuth);
    app.use("/api", apiRouter);
}
exports.default = apiRouter;
