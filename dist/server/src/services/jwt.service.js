import jwt from "jsonwebtoken";
import { requireEnv } from "../env.js";
const SIGN_OPTIONS = {
    expiresIn: "1h",
};
function getJwtSecret() {
    return requireEnv("JWT_SECRET");
}
function isAccessTokenPayload(payload) {
    return (typeof payload.email === "string" && typeof payload.userId === "string");
}
export function signAccessToken(payload) {
    return jwt.sign(payload, getJwtSecret(), SIGN_OPTIONS);
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === "string") {
        throw new Error("Invalid JWT payload");
    }
    if (!isAccessTokenPayload(decoded)) {
        throw new Error("Invalid JWT payload");
    }
    return decoded;
}
