// server/src/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  role: varchar("role", { length: 50 })
    .$type<"admin" | "staff" | "lender" | "referrer">()
    .default("staff"),

  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
