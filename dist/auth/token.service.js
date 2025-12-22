import { jwtService } from "../services/jwt.service.js";
function buildPayload(user) {
    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
}
export function createAccessToken(user) {
    const payload = buildPayload(user);
    const accessToken = jwtService.signAccessToken(payload);
    const decodedAccess = jwtService.decode(accessToken);
    const accessExpiresAt = decodedAccess?.exp ? new Date(decodedAccess.exp * 1000) : new Date();
    return { accessToken, accessExpiresAt };
}
export const tokenService = {
    createAccessToken,
};
