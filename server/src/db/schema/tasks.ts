import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { applications } from "./applications";

export const taskStatusEnum = pgEnum("task_status", ["open", "completed", "cancelled"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  assignedByUserId: uuid("assigned_by_user_id")
    .references(() => users.id, { onDelete: "set null" })
    .notNull(),
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: taskStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
