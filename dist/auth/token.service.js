"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = void 0;
exports.createAccessToken = createAccessToken;
const jwt_service_1 = require("../services/jwt.service");
function buildPayload(user) {
    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
}
function createAccessToken(user) {
    const payload = buildPayload(user);
    const accessToken = jwt_service_1.jwtService.signAccessToken(payload);
    const decodedAccess = jwt_service_1.jwtService.decode(accessToken);
    const accessExpiresAt = decodedAccess?.exp ? new Date(decodedAccess.exp * 1000) : new Date();
    return { accessToken, accessExpiresAt };
}
exports.tokenService = {
    createAccessToken,
};
