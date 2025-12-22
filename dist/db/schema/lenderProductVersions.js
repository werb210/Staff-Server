import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { lenderProducts } from "./lenderProducts";
export const lenderProductVersions = pgTable("lender_product_versions", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
        .references(() => lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    snapshot: jsonb("snapshot").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const lenderDynamicQuestionVersions = pgTable("lender_dynamic_question_versions", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
        .references(() => lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    lenderDynamicQuestionId: uuid("lender_dynamic_question_id"),
    snapshot: jsonb("snapshot").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const lenderRequiredDocumentVersions = pgTable("lender_required_document_versions", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
        .references(() => lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    lenderRequiredDocumentId: uuid("lender_required_document_id"),
    snapshot: jsonb("snapshot").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
