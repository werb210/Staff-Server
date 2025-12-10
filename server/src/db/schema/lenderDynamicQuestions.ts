import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lenderProducts } from "./lenderProducts";

export const lenderDynamicQuestions = pgTable("lender_dynamic_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  lenderProductId: uuid("lender_product_id")
    .references(() => lenderProducts.id, { onDelete: "cascade" })
    .notNull(),
  appliesTo: text("applies_to").notNull(),
  prompt: text("prompt").notNull(),
  fieldType: text("field_type").notNull(),
  options: jsonb("options").default([]).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isRequired: boolean("is_required").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
