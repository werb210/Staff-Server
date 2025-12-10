import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { documentVersions } from "./documents";
import { users } from "./users";

export const aiTrainingChunks = pgTable("ai_training_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  documentVersionId: uuid("document_version_id").references(() => documentVersions.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  requestType: text("request_type").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
