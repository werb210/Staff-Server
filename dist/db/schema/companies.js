"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.companies = (0, pg_core_1.pgTable)("companies", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    industry: (0, pg_core_1.text)("industry"),
    website: (0, pg_core_1.text)("website"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
