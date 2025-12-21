import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { companies } from "./companies";

export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "locked"]);
export const userRoleEnum = pgEnum("user_role", ["Admin", "Staff", "Lender", "Referrer"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("Staff"),
  status: userStatusEnum("status").default("active").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  phone: text("phone"),
  company_id: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
