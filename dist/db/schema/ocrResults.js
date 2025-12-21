import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { documentVersions, documents } from "./documents";
export const ocrResults = pgTable("ocr_results", {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
        .references(() => applications.id, { onDelete: "cascade" })
        .notNull(),
    documentId: uuid("document_id")
        .references(() => documents.id, { onDelete: "cascade" })
        .notNull(),
    documentVersionId: uuid("document_version_id")
        .references(() => documentVersions.id, { onDelete: "set null" })
        .notNull(),
    blobKey: text("blob_key").notNull(),
    extractedText: jsonb("extracted_text").default({}).notNull(),
    extractedJson: jsonb("extracted_json").default({}).notNull(),
    categoriesDetected: jsonb("categories_detected").default([]).notNull(),
    conflictingFields: jsonb("conflicting_fields").default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    status: text("status").default("completed").notNull(),
});
