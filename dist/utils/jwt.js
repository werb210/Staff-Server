import { jwtService } from "../services/jwt.service.js";
export function generateAccessToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    return { token: jwtService.signAccessToken(payload), payload };
}
export function verifyAccessToken(token) {
    return jwtService.verifyAccessToken(token);
}
