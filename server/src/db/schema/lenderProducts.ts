import { boolean, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const lenderProducts = pgTable(
  "lender_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderName: text("lender_name").notNull(),
    productName: text("product_name").notNull(),
    productType: text("product_type").notNull(),
    minAmount: numeric("min_amount", { precision: 14, scale: 2 }),
    maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lenderIdx: index("lender_products_lender_idx").on(table.lenderName),
  }),
);
