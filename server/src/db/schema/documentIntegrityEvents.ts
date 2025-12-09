import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { documents } from "./documents";

export const documentIntegrityEvents = pgTable("document_integrity_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
