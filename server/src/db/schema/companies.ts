// server/src/db/schema/companies.ts
import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  legalName: varchar("legal_name").notNull(),
  industry: varchar("industry"),
  location: varchar("location"),
  createdAt: timestamp("created_at").defaultNow()
});
