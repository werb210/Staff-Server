import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { aiTrainingSourceEnum } from "./enums.js";
import { applications } from "./applications.js";

export const aiTrainingChunks = pgTable("ai_training_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
  sourceType: aiTrainingSourceEnum("source_type").notNull(),
  sourceId: text("source_id"),
  content: text("content").notNull(),
  embedding: jsonb("embedding"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
