"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationTimelineEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
const users_1 = require("./users");
exports.applicationTimelineEvents = (0, pg_core_1.pgTable)("application_timeline_events", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    eventType: (0, pg_core_1.text)("event_type").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}).notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
    actorUserId: (0, pg_core_1.uuid)("actor_user_id").references(() => users_1.users.id, { onDelete: "set null" }),
});
