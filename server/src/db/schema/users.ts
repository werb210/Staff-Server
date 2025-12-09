import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { userStatusEnum, userTypeEnum } from "./enums.js";
import { roles } from "./roles.js";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  userType: userTypeEnum("user_type").notNull().default("staff"),
  status: userStatusEnum("status").notNull().default("active"),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "restrict" }).notNull(),
  timezone: text("timezone"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applicants = users;
