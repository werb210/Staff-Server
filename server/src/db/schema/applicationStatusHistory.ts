import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { users } from "./users";

export const applicationStatusHistory = pgTable("application_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
});
