"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditSummaries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
exports.creditSummaries = (0, pg_core_1.pgTable)("credit_summaries", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    version: (0, pg_core_1.integer)("version").default(1).notNull(),
    summaryJson: (0, pg_core_1.jsonb)("summary_json").default({}).notNull(),
    pdfBlobKey: (0, pg_core_1.text)("pdf_blob_key"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    applicationIdx: (0, pg_core_1.index)("credit_summaries_application_idx").on(table.applicationId),
    versionIdx: (0, pg_core_1.index)("credit_summaries_version_idx").on(table.applicationId, table.version),
}));
