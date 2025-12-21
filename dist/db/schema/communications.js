"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communications = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
exports.communications = (0, pg_core_1.pgTable)("communications", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id").references(() => applications_1.applications.id, { onDelete: "set null" }),
    type: (0, pg_core_1.text)("type").notNull(),
    direction: (0, pg_core_1.text)("direction").notNull(),
    body: (0, pg_core_1.text)("body").notNull(),
    from: (0, pg_core_1.text)("from").notNull(),
    to: (0, pg_core_1.text)("to").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}).notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
