import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lenderProducts } from "./lenderProducts";
export const productRequiredDocs = pgTable("product_required_docs", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
        .references(() => lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
