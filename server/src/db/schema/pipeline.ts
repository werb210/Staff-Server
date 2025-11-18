import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const pipeline = pgTable("pipeline", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  stage: varchar("stage", { length: 100 }).notNull(),
  order: integer("order").default(0).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Pipeline = typeof pipeline.$inferSelect;
export type NewPipeline = typeof pipeline.$inferInsert;
