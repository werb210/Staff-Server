"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userRoleEnum = exports.userStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_1 = require("./companies");
exports.userStatusEnum = (0, pg_core_1.pgEnum)("user_status", ["active", "inactive", "locked"]);
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["Admin", "Staff", "Lender", "Referrer"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    password_hash: (0, pg_core_1.text)("password_hash").notNull(),
    first_name: (0, pg_core_1.text)("first_name").notNull(),
    last_name: (0, pg_core_1.text)("last_name").notNull(),
    role: (0, exports.userRoleEnum)("role").notNull().default("Staff"),
    status: (0, exports.userStatusEnum)("status").default("active").notNull(),
    is_active: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    phone: (0, pg_core_1.text)("phone"),
    phone_verified: (0, pg_core_1.boolean)("phone_verified").notNull().default(false),
    company_id: (0, pg_core_1.uuid)("company_id").references(() => companies_1.companies.id, { onDelete: "set null" }),
    created_at: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
    last_login_at: (0, pg_core_1.timestamp)("last_login_at", { withTimezone: true }),
});
