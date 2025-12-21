import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { users } from "./users";
export const applicationTimelineEvents = pgTable("application_timeline_events", {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
        .references(() => applications.id, { onDelete: "cascade" })
        .notNull(),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
});
