import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { documentVersions } from "./documents";

export const ocrResults = pgTable("ocr_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  documentVersionId: uuid("document_version_id")
    .references(() => documentVersions.id, { onDelete: "set null" })
    .notNull(),
  blobKey: text("blob_key").notNull(),
  extractedText: jsonb("extracted_text").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").default("completed").notNull(),
});
