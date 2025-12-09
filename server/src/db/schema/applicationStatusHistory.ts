import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applicationStageEnum, applicationStatusEnum } from "./enums.js";
import { applications } from "./applications.js";
import { users } from "./users.js";

export const applicationStatusHistory = pgTable("application_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  status: applicationStatusEnum("status").notNull(),
  stage: applicationStageEnum("stage").notNull(),
  note: text("note"),
  changedByUserId: uuid("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
