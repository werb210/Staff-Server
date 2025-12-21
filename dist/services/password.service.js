"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const TOKEN_SALT_ROUNDS = 10;
const PASSWORD_SALT_ROUNDS = 12;
exports.passwordService = {
    async hashPassword(password) {
        return bcrypt_1.default.hash(password, PASSWORD_SALT_ROUNDS);
    },
    async verifyPassword(password, hash) {
        return bcrypt_1.default.compare(password, hash);
    },
    async hashToken(token) {
        return bcrypt_1.default.hash(token, TOKEN_SALT_ROUNDS);
    },
    async verifyToken(token, hash) {
        return bcrypt_1.default.compare(token, hash);
    },
};
