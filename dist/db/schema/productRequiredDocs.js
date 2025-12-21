"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRequiredDocs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const lenderProducts_1 = require("./lenderProducts");
exports.productRequiredDocs = (0, pg_core_1.pgTable)("product_required_docs", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    isMandatory: (0, pg_core_1.boolean)("is_mandatory").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
