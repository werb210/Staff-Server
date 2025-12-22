import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["Admin", "Staff", "Lender", "Referrer"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: userRoleEnum("role").notNull().default("Staff"),
});
