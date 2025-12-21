"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasks = exports.taskStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const applications_1 = require("./applications");
exports.taskStatusEnum = (0, pg_core_1.pgEnum)("task_status", ["open", "completed", "cancelled"]);
exports.tasks = (0, pg_core_1.pgTable)("tasks", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    assignedByUserId: (0, pg_core_1.uuid)("assigned_by_user_id")
        .references(() => users_1.users.id, { onDelete: "set null" })
        .notNull(),
    assignedToUserId: (0, pg_core_1.uuid)("assigned_to_user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    applicationId: (0, pg_core_1.uuid)("application_id").references(() => applications_1.applications.id, { onDelete: "set null" }),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").default("").notNull(),
    dueDate: (0, pg_core_1.timestamp)("due_date", { withTimezone: true }),
    status: (0, exports.taskStatusEnum)("status").default("open").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
