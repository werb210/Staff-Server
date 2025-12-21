"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
const algorithm = "HS256";
const accessSecret = config_1.authConfig.ACCESS_TOKEN_SECRET;
exports.jwtService = {
    signAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, accessSecret, {
            expiresIn: config_1.authConfig.ACCESS_TOKEN_EXPIRES_IN,
            algorithm,
        });
    },
    verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, accessSecret);
    },
    decode(token) {
        return jsonwebtoken_1.default.decode(token);
    },
};
