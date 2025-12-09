import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ocrStatusEnum } from "./enums.js";
import { documentVersions } from "./documentVersions.js";

export const ocrResults = pgTable("ocr_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentVersionId: uuid("document_version_id")
    .references(() => documentVersions.id, { onDelete: "cascade" })
    .notNull(),
  status: ocrStatusEnum("status").notNull().default("pending"),
  rawText: text("raw_text"),
  extractedData: jsonb("extracted_data"),
  error: text("error"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
