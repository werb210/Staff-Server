import jwt from "jsonwebtoken";
import { authConfig } from "../config/config";
const algorithm = "HS256";
const accessSecret = authConfig.ACCESS_TOKEN_SECRET;
export const jwtService = {
    signAccessToken(payload) {
        return jwt.sign(payload, accessSecret, {
            expiresIn: authConfig.ACCESS_TOKEN_EXPIRES_IN,
            algorithm,
        });
    },
    verifyAccessToken(token) {
        return jwt.verify(token, accessSecret);
    },
    decode(token) {
        return jwt.decode(token);
    },
};
