import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { documentCategoryEnum } from "./enums.js";
import { lenderProducts } from "./products.js";

export const lenderRequiredDocuments = pgTable("lender_required_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  lenderProductId: uuid("lender_product_id")
    .references(() => lenderProducts.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  category: documentCategoryEnum("category").notNull(),
  description: text("description"),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  allowsMultiple: boolean("allows_multiple").notNull().default(false),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
