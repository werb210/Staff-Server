"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthError = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const token_service_1 = require("./token.service");
class AuthError extends Error {
    status;
    constructor(message, status = 401) {
        super(message);
        this.status = status;
    }
}
exports.AuthError = AuthError;
exports.authService = {
    async login(input) {
        const email = input.email.trim().toLowerCase();
        const [user] = await db_1.db
            .select({
            id: schema_1.users.id,
            email: schema_1.users.email,
            role: schema_1.users.role,
            status: schema_1.users.status,
            firstName: schema_1.users.first_name,
            lastName: schema_1.users.last_name,
            isActive: schema_1.users.is_active,
            passwordHash: schema_1.users.password_hash,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .limit(1);
        if (!user || !user.isActive) {
            throw new AuthError("Invalid credentials", 401);
        }
        const ok = await bcrypt_1.default.compare(input.password, user.passwordHash);
        if (!ok) {
            throw new AuthError("Invalid credentials", 401);
        }
        const authUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            firstName: user.firstName ?? undefined,
            lastName: user.lastName ?? undefined,
        };
        const tokens = (0, token_service_1.createAccessToken)(authUser);
        return { user: authUser, tokens };
    },
};
