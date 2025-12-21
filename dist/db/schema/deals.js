"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deals = exports.dealStageEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_1 = require("./companies");
const users_1 = require("./users");
exports.dealStageEnum = (0, pg_core_1.pgEnum)("deal_stage", ["prospect", "qualified", "proposal", "closed_won", "closed_lost"]);
exports.deals = (0, pg_core_1.pgTable)("deals", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)("company_id").references(() => companies_1.companies.id, { onDelete: "cascade" }).notNull(),
    ownerId: (0, pg_core_1.uuid)("owner_id").references(() => users_1.users.id, { onDelete: "set null" }),
    name: (0, pg_core_1.text)("name").notNull(),
    stage: (0, exports.dealStageEnum)("stage").default("prospect").notNull(),
    value: (0, pg_core_1.numeric)("value", { precision: 14, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    companyIdx: (0, pg_core_1.index)("deals_company_idx").on(table.companyId),
    stageIdx: (0, pg_core_1.index)("deals_stage_idx").on(table.stage),
}));
