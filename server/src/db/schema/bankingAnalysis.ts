import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { documentVersions } from "./documents";

export const bankingAnalysis = pgTable("banking_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  documentVersionId: uuid("document_version_id").references(() => documentVersions.id, { onDelete: "set null" }),
  summary: jsonb("summary").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").default("completed").notNull(),
});
