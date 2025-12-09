import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lenderProducts } from "./lenderProducts";

export const lenderRequiredDocuments = pgTable("lender_required_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id, { onDelete: "cascade" }).notNull(),
  documentType: text("document_type").notNull(),
  displayName: text("display_name").notNull(),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
