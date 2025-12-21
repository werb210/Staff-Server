"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const cors_1 = require("./config/cors");
const app = (0, express_1.default)();
exports.app = app;
(0, cors_1.applyCors)(app);
app.use(express_1.default.json());
(0, routes_1.registerRoutes)(app);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
});
// error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error("Unhandled error", err);
    res.status(500).json({ error: "Internal Server Error" });
});
exports.default = app;
