// server/src/db/schema/pipeline.ts
import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const pipeline = pgTable("pipeline", {
  id: varchar("id").primaryKey(),
  applicationId: varchar("application_id").notNull(),
  stage: varchar("stage").notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});
