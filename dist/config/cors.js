"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = void 0;
exports.applyCors = applyCors;
const cors_1 = __importDefault(require("cors"));
const allowedOrigins = ["https://staff.boreal.financial"];
exports.corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    credentials: false,
};
function applyCors(app) {
    const corsMiddleware = (0, cors_1.default)(exports.corsOptions);
    app.use(corsMiddleware);
    app.options("*", corsMiddleware);
    app.use((req, res, next) => {
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        return next();
    });
}
