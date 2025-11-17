// server/src/db/schema/companies.ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  location: varchar("location", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
});
