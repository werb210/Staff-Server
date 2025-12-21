"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lenderRequiredDocumentVersions = exports.lenderDynamicQuestionVersions = exports.lenderProductVersions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const lenderProducts_1 = require("./lenderProducts");
exports.lenderProductVersions = (0, pg_core_1.pgTable)("lender_product_versions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    snapshot: (0, pg_core_1.jsonb)("snapshot").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
});
exports.lenderDynamicQuestionVersions = (0, pg_core_1.pgTable)("lender_dynamic_question_versions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    lenderDynamicQuestionId: (0, pg_core_1.uuid)("lender_dynamic_question_id"),
    snapshot: (0, pg_core_1.jsonb)("snapshot").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
});
exports.lenderRequiredDocumentVersions = (0, pg_core_1.pgTable)("lender_required_document_versions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    lenderRequiredDocumentId: (0, pg_core_1.uuid)("lender_required_document_id"),
    snapshot: (0, pg_core_1.jsonb)("snapshot").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
});
