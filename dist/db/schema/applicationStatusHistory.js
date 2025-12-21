"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationStatusHistory = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
const users_1 = require("./users");
exports.applicationStatusHistory = (0, pg_core_1.pgTable)("application_status_history", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    fromStatus: (0, pg_core_1.text)("from_status"),
    toStatus: (0, pg_core_1.text)("to_status").notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
    changedBy: (0, pg_core_1.uuid)("changed_by").references(() => users_1.users.id, { onDelete: "set null" }),
});
