"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signJwt = signJwt;
exports.verifyJwt = verifyJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}
const jwtSecret = JWT_SECRET;
const JWT_EXPIRES_IN = "7d";
function signJwt(payload) {
    return jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRES_IN });
}
function isAccessTokenPayload(decoded) {
    if (typeof decoded !== "object" || decoded === null) {
        return false;
    }
    const { email } = decoded;
    return typeof email === "string";
}
function verifyJwt(token) {
    const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
    if (!isAccessTokenPayload(decoded)) {
        throw new Error("Invalid token payload");
    }
    return decoded;
}
