import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";

export const communications = pgTable("communications", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  direction: text("direction").notNull(),
  body: text("body").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
