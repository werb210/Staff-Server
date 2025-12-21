"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const phone = process.env.ADMIN_PHONE?.trim();
    if (!email || !password || !phone) {
        throw new Error("ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_PHONE must be set");
    }
    console.log("🔥 Deleting ALL users");
    await db_1.db.delete(schema_1.users);
    console.log("🔐 Creating ADMIN user");
    const password_hash = await bcrypt_1.default.hash(password, 12);
    await db_1.db.insert(schema_1.users).values({
        email,
        password_hash,
        first_name: "Admin",
        last_name: "User",
        role: "Admin",
        status: "active",
        is_active: true,
        phone,
    });
    console.log("✅ Admin seeded:", email);
}
let exitCode = 0;
seedAdmin()
    .catch((error) => {
    console.error("❌ Seed failed:", error);
    exitCode = 1;
})
    .finally(async () => {
    await (0, db_1.closeDatabase)().catch(() => undefined);
    process.exit(exitCode);
});
