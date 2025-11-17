// server/src/db/schema/lenders.ts
import { pgTable, varchar, boolean, text } from "drizzle-orm/pg-core";

export const lenders = pgTable("lenders", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  country: varchar("country").notNull(),
  active: boolean("active").default(true),
  notes: text("notes")
});
