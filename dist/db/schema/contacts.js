"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contacts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_1 = require("./companies");
exports.contacts = (0, pg_core_1.pgTable)("contacts", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)("company_id").references(() => companies_1.companies.id, { onDelete: "cascade" }),
    firstName: (0, pg_core_1.text)("first_name").notNull(),
    lastName: (0, pg_core_1.text)("last_name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    title: (0, pg_core_1.text)("title"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyIdx: (0, pg_core_1.index)("contacts_company_idx").on(table.companyId),
    emailIdx: (0, pg_core_1.index)("contacts_email_idx").on(table.email),
}));
