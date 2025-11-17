import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";
import { lenders } from "./lenders.js";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  lenderId: uuid("lender_id").references(() => lenders.id).notNull(),

  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  minAmount: integer("min_amount").notNull(),
  maxAmount: integer("max_amount").notNull(),
  rate: integer("rate").notNull()
});
