// server/src/db/schema/products.ts
import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
