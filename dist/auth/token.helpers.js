"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAccessToken = extractAccessToken;
exports.extractRefreshToken = extractRefreshToken;
function extractAccessToken(req) {
    const header = req.headers.authorization;
    if (header?.toLowerCase().startsWith("bearer ")) {
        return header.split(" ")[1];
    }
    return null;
}
function extractRefreshToken(req) {
    const header = req.headers["x-refresh-token"];
    if (typeof header === "string")
        return header;
    return null;
}
