"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const config_1 = require("./config");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const auth_1 = require("./middleware/auth");
const me_1 = require("./routes/auth/me");
const app = (0, express_1.default)();
// Core middleware
app.use((0, cors_1.default)({
    origin: [
        "https://staff.boreal.financial",
        "http://localhost:5173",
    ],
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
// HARD mount — must exist or 404
app.use("/auth", auth_routes_1.default);
app.get("/api/auth/me", auth_1.requireAuth, me_1.authMeHandler);
// DEBUG: confirm route registration at boot
console.log("AUTH ROUTES MOUNTED AT /auth");
// Root (Azure health probe hits this)
app.get('/', (_req, res) => {
    res.status(200).send('ok');
});
// Explicit health endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// 🔴 CRITICAL: Azure requires process.env.PORT
const port = Number(process.env.PORT) || config_1.env.PORT || 4000;
// Hard visibility into runtime state
console.log('BOOT: START');
console.log('PORT CHECK', {
    processEnv: process.env.PORT,
    parsedEnv: config_1.env.PORT,
    finalPort: port,
});
const server = http_1.default.createServer(app);
server.listen(port, () => {
    console.log(`BOOT: LISTENING ON ${port}`);
});
// Crash hard — never silent fail
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION', err);
    process.exit(1);
});
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION', err);
    process.exit(1);
});
