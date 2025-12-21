"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lenderDynamicQuestions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const lenderProducts_1 = require("./lenderProducts");
exports.lenderDynamicQuestions = (0, pg_core_1.pgTable)("lender_dynamic_questions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    questionId: (0, pg_core_1.uuid)("question_id"),
    label: (0, pg_core_1.text)("label").notNull(),
    type: (0, pg_core_1.text)("type").notNull(),
    options: (0, pg_core_1.jsonb)("options").default([]).notNull(),
    required: (0, pg_core_1.boolean)("required").default(true).notNull(),
    orderIndex: (0, pg_core_1.integer)("order_index").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
