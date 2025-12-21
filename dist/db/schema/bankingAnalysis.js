"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankingAnalysis = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
const documents_1 = require("./documents");
exports.bankingAnalysis = (0, pg_core_1.pgTable)("banking_analysis", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id")
        .references(() => applications_1.applications.id, { onDelete: "cascade" })
        .notNull(),
    documentVersionId: (0, pg_core_1.uuid)("document_version_id").references(() => documents_1.documentVersions.id, { onDelete: "set null" }),
    summary: (0, pg_core_1.jsonb)("summary").default({}).notNull(),
    metricsJson: (0, pg_core_1.jsonb)("metrics_json").default({}).notNull(),
    monthlyJson: (0, pg_core_1.jsonb)("monthly_json").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    status: (0, pg_core_1.text)("status").default("completed").notNull(),
});
