"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
async function run() {
    const password = process.env.ADMIN_RESET_PASSWORD;
    const targetEmail = (process.env.TARGET_EMAIL ?? "admin@boreal.financial").trim().toLowerCase();
    if (!password) {
        throw new Error("ADMIN_RESET_PASSWORD is required in the environment");
    }
    const password_hash = await bcrypt_1.default.hash(password, 12);
    const updated = await db_1.db
        .update(schema_1.users)
        .set({ password_hash })
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, targetEmail))
        .returning({ id: schema_1.users.id, email: schema_1.users.email });
    if (!updated || updated.length === 0) {
        throw new Error(`No user found for ${targetEmail}`);
    }
}
let exitCode = 0;
run()
    .then(() => {
    console.log("Admin password reset OK");
})
    .catch((error) => {
    console.error("Failed to reset admin password", error);
    exitCode = 1;
})
    .finally(async () => {
    await (0, db_1.closeDatabase)().catch(() => undefined);
    process.exit(exitCode);
});
