import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lenderProducts } from "./lenderProducts";
export const lenderDynamicQuestions = pgTable("lender_dynamic_questions", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
        .references(() => lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    questionId: uuid("question_id"),
    label: text("label").notNull(),
    type: text("type").notNull(),
    options: jsonb("options").default([]).notNull(),
    required: boolean("required").default(true).notNull(),
    orderIndex: integer("order_index").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
