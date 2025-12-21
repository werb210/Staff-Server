"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productQuestions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const lenderProducts_1 = require("./lenderProducts");
exports.productQuestions = (0, pg_core_1.pgTable)("product_questions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    question: (0, pg_core_1.text)("question").notNull(),
    fieldType: (0, pg_core_1.text)("field_type").notNull(),
    isRequired: (0, pg_core_1.boolean)("is_required").default(true).notNull(),
    options: (0, pg_core_1.jsonb)("options").default([]).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
