"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultUsers = ensureDefaultUsers;
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../config/config");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const password_service_1 = require("./password.service");
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "BorealAdmin!2025";
const DEFAULT_STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "BorealStaff!2025";
async function upsertDefaultUser(user) {
    const password_hash = await password_service_1.passwordService.hashPassword(user.password);
    await db_1.db
        .insert(schema_1.users)
        .values({
        email: user.email.toLowerCase(),
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        status: "active",
        password_hash,
        is_active: true,
    })
        .onConflictDoUpdate({
        target: schema_1.users.email,
        set: {
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            status: "active",
            password_hash,
            is_active: true,
            updated_at: (0, drizzle_orm_1.sql) `now()`,
        },
    });
}
async function ensureDefaultUsers() {
    if (!config_1.config.JWT_SECRET && config_1.config.NODE_ENV === "production") {
        // In production, this code runs only after required envs are set via index.ts
        // but we keep a guard here to avoid running with an invalid configuration.
        throw new Error("JWT_SECRET is required before ensuring default users");
    }
    await upsertDefaultUser({
        email: "admin@boreal.financial",
        firstName: "System",
        lastName: "Admin",
        role: "Admin",
        password: DEFAULT_ADMIN_PASSWORD,
    });
    console.log("Ensured default admin user exists");
    await upsertDefaultUser({
        email: "staff@boreal.financial",
        firstName: "System",
        lastName: "Staff",
        role: "Staff",
        password: DEFAULT_STAFF_PASSWORD,
    });
    console.log("Ensured default staff user exists");
}
