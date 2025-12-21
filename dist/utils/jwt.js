"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.verifyAccessToken = verifyAccessToken;
const jwt_service_1 = require("../services/jwt.service");
function generateAccessToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    return { token: jwt_service_1.jwtService.signAccessToken(payload), payload };
}
function verifyAccessToken(token) {
    return jwt_service_1.jwtService.verifyAccessToken(token);
}
