import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { productTypeEnum } from "./enums.js";

export const lenderProducts = pgTable("lender_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  lenderName: text("lender_name").notNull(),
  productName: text("product_name").notNull(),
  productType: productTypeEnum("product_type").notNull(),
  minAmount: numeric("min_amount", { precision: 14, scale: 2 }),
  maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
  minRate: numeric("min_rate", { precision: 6, scale: 3 }),
  maxRate: numeric("max_rate", { precision: 6, scale: 3 }),
  termMonths: integer("term_months"),
  fees: jsonb("fees").notNull().default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const products = lenderProducts;
