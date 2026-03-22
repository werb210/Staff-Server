"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
// ===============================
// BASIC MIDDLEWARE
// ===============================
app.use(express_1.default.json());
// ===============================
// HEALTH
// ===============================
app.get("/health", (req, res) => {
    res.json({ ok: true });
});
// ===============================
// ROUTES (IMPORT YOUR REGISTRY HERE)
// ===============================
// Example:
// import { registerRoutes } from "./api";
// registerRoutes(app);
// ===============================
// JSON 404 (MUST BE AFTER ROUTES)
// ===============================
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        path: req.originalUrl,
        method: req.method,
    });
});
// ===============================
// GLOBAL ERROR HANDLER (LAST)
// ===============================
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});
// ===============================
// START SERVER (LAST STEP ONLY)
// ===============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`SERVER RUNNING ON ${PORT}`);
});
