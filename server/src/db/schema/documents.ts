import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { companies } from "./companies";
import { contacts } from "./contacts";
import { users } from "./users";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    documentType: text("document_type"),
    category: text("category"),
    originalFilename: text("original_filename"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    storagePath: text("storage_path").notNull(),
    s3Key: text("s3_key"),
    checksumSha256: text("checksum_sha256"),
    checksum: text("checksum").notNull(),
    version: integer("version").default(1).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    accepted: boolean("accepted"),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    applicationIdx: index("documents_application_idx").on(table.applicationId),
    checksumIdx: index("documents_checksum_idx").on(table.checksum),
  }),
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
    versionNumber: integer("version_number").default(1).notNull(),
    version: integer("version"),
    storagePath: text("storage_path").notNull(),
    s3Key: text("s3_key"),
    checksum: text("checksum").notNull(),
    checksumSha256: text("checksum_sha256"),
    sizeBytes: integer("size_bytes").notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    createdBy: uuid("created_by"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_versions_document_idx").on(table.documentId),
  }),
);
