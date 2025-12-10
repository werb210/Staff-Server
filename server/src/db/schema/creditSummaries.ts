import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";

export const creditSummaries = pgTable(
  "credit_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .references(() => applications.id, { onDelete: "cascade" })
      .notNull(),
    version: integer("version").default(1).notNull(),
    summaryJson: jsonb("summary_json").default({}).notNull(),
    pdfBlobKey: text("pdf_blob_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    applicationIdx: index("credit_summaries_application_idx").on(table.applicationId),
    versionIdx: index("credit_summaries_version_idx").on(table.applicationId, table.version),
  }),
);
