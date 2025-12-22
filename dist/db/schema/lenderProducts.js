import { boolean, index, integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
export const lenderProductCategoryEnum = pgEnum("lender_product_category", [
    "working_capital",
    "term_loan",
    "loc",
    "factoring",
    "po_funding",
    "equipment_finance",
    "startup",
]);
export const lenderProducts = pgTable("lender_products", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderId: uuid("lender_id"),
    lenderName: text("lender_name").notNull(),
    productName: text("product_name").notNull(),
    productType: text("product_type").notNull(),
    productCategory: lenderProductCategoryEnum("product_category"),
    minAmount: numeric("min_amount", { precision: 14, scale: 2 }),
    maxAmount: numeric("max_amount", { precision: 14, scale: 2 }),
    minMonthsInBusiness: integer("min_months_in_business"),
    minRevenue: numeric("min_revenue", { precision: 14, scale: 2 }),
    geographicRestrictions: text("geographic_restrictions").array(),
    active: boolean("active").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    lenderIdx: index("lender_products_lender_idx").on(table.lenderName),
}));
