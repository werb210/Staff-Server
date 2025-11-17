import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 200 }).notNull(),
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 })
});
