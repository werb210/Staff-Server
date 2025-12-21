"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrResults = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
const documents_1 = require("./documents");
exports.ocrResults = (0, pg_core_1.pgTable)("ocr_results", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    documentId: (0, pg_core_1.uuid)("document_id")
        .references(() => documents_1.documents.id, { onDelete: "cascade" })
        .notNull(),
    documentVersionId: (0, pg_core_1.uuid)("document_version_id")
        .references(() => documents_1.documentVersions.id, { onDelete: "set null" })
        .notNull(),
    blobKey: (0, pg_core_1.text)("blob_key").notNull(),
    extractedText: (0, pg_core_1.jsonb)("extracted_text").default({}).notNull(),
    extractedJson: (0, pg_core_1.jsonb)("extracted_json").default({}).notNull(),
    categoriesDetected: (0, pg_core_1.jsonb)("categories_detected").default([]).notNull(),
    conflictingFields: (0, pg_core_1.jsonb)("conflicting_fields").default([]).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    status: (0, pg_core_1.text)("status").default("completed").notNull(),
});
