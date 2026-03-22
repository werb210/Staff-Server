"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = corsMiddleware;
const env_1 = require("../config/env");
const allowedOrigins = [
    env_1.ENV.CLIENT_URL,
    env_1.ENV.PORTAL_URL,
    "https://server.boreal.financial",
    "https://staff.boreal.financial",
    "https://client.boreal.financial",
];
function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }
    next();
}
