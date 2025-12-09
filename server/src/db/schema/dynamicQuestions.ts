import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { questionTypeEnum } from "./enums.js";
import { applications } from "./applications.js";
import { lenderProducts } from "./products.js";

export const dynamicQuestions = pgTable("dynamic_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
  fieldKey: text("field_key").notNull(),
  prompt: text("prompt").notNull(),
  questionType: questionTypeEnum("question_type").notNull(),
  options: jsonb("options").notNull().default(sql`'[]'::jsonb`),
  isRequired: boolean("is_required").notNull().default(true),
  helperText: text("helper_text"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
