// server/src/db/schema/lenders.ts
import { pgTable, text, varchar, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const lenders = pgTable("lenders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
