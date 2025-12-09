import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { documentCategoryEnum, documentStatusEnum } from "./enums.js";
import { applications } from "./applications.js";
import { applicantOwners } from "./applicantOwners.js";
import { lenderRequiredDocuments } from "./lenderRequiredDocuments.js";
import { users } from "./users.js";

export const uploadedDocuments = pgTable("uploaded_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .references(() => applications.id, { onDelete: "cascade" })
    .notNull(),
  ownerId: uuid("owner_id").references(() => applicantOwners.id, { onDelete: "set null" }),
  requiredDocumentId: uuid("required_document_id").references(() => lenderRequiredDocuments.id, { onDelete: "set null" }),
  documentType: documentCategoryEnum("document_type"),
  status: documentStatusEnum("status").notNull().default("pending"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = uploadedDocuments;
