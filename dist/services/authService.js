"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyUserCredentials = verifyUserCredentials;
// server/src/services/authService.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function verifyUserCredentials(email, password) {
    const result = await db_1.db
        .select({
        id: schema_1.users.id,
        email: schema_1.users.email,
        role: schema_1.users.role,
        passwordHash: schema_1.users.password_hash,
        status: schema_1.users.status,
        isActive: schema_1.users.is_active,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
        .limit(1);
    const user = result[0];
    if (!user)
        return null;
    const isDisabled = (typeof user.isActive === "boolean" && !user.isActive) ||
        (user.status && user.status !== "active");
    if (isDisabled)
        return null;
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok)
        return null;
    return {
        id: user.id,
        email: user.email,
        role: user.role,
    };
}
