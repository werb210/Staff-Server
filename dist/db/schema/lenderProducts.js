"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lenderProducts = exports.lenderProductCategoryEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.lenderProductCategoryEnum = (0, pg_core_1.pgEnum)("lender_product_category", [
    "working_capital",
    "term_loan",
    "loc",
    "factoring",
    "po_funding",
    "equipment_finance",
    "startup",
]);
exports.lenderProducts = (0, pg_core_1.pgTable)("lender_products", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderId: (0, pg_core_1.uuid)("lender_id"),
    lenderName: (0, pg_core_1.text)("lender_name").notNull(),
    productName: (0, pg_core_1.text)("product_name").notNull(),
    productType: (0, pg_core_1.text)("product_type").notNull(),
    productCategory: (0, exports.lenderProductCategoryEnum)("product_category"),
    minAmount: (0, pg_core_1.numeric)("min_amount", { precision: 14, scale: 2 }),
    maxAmount: (0, pg_core_1.numeric)("max_amount", { precision: 14, scale: 2 }),
    minMonthsInBusiness: (0, pg_core_1.integer)("min_months_in_business"),
    minRevenue: (0, pg_core_1.numeric)("min_revenue", { precision: 14, scale: 2 }),
    geographicRestrictions: (0, pg_core_1.text)("geographic_restrictions").array(),
    active: (0, pg_core_1.boolean)("active").default(true).notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    lenderIdx: (0, pg_core_1.index)("lender_products_lender_idx").on(table.lenderName),
}));
