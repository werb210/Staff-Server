import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lenderProducts } from "./lenderProducts";

export const productQuestions = pgTable("product_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  lenderProductId: uuid("lender_product_id")
    .references(() => lenderProducts.id, { onDelete: "cascade" })
    .notNull(),
  question: text("question").notNull(),
  fieldType: text("field_type").notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  options: jsonb("options").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
