import { sql } from "drizzle-orm";
import { config } from "../config/config";
import { db } from "../db";
import { users } from "../db/schema";
import { passwordService } from "./password.service";
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "BorealAdmin!2025";
const DEFAULT_STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "BorealStaff!2025";
async function upsertDefaultUser(user) {
    const password_hash = await passwordService.hashPassword(user.password);
    await db
        .insert(users)
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
        target: users.email,
        set: {
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
            status: "active",
            password_hash,
            is_active: true,
            updated_at: sql `now()`,
        },
    });
}
export async function ensureDefaultUsers() {
    if (!config.JWT_SECRET && config.NODE_ENV === "production") {
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
