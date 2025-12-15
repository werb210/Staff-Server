import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies";

export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "locked"]);
export const userRoleEnum = pgEnum("user_role", ["Admin", "Staff", "Lender", "Referrer"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("Staff"),
  status: userStatusEnum("status").default("active").notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
