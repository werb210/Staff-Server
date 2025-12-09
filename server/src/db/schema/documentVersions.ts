import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uploadedDocuments } from "./documents.js";
import { users } from "./users.js";

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .references(() => uploadedDocuments.id, { onDelete: "cascade" })
    .notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  storagePath: text("storage_path").notNull(),
  checksum: text("checksum"),
  isCurrent: boolean("is_current").notNull().default(true),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
