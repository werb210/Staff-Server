import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { companies } from "./companies";
import { contacts } from "./contacts";
import { users } from "./users";
import { lenderProducts } from "./lenderProducts";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id").references(() => applications.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    blobKey: text("blob_key").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    version: integer("version").default(1).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    missingFlag: boolean("missing_flag").default(false).notNull(),
    restoredFlag: boolean("restored_flag").default(false).notNull(),
    azureMetadata: jsonb("azure_metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    applicationIdx: index("documents_application_idx").on(table.applicationId),
    checksumIdx: index("documents_checksum_idx").on(table.checksumSha256),
  }),
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
    versionNumber: integer("version_number").default(1).notNull(),
    blobKey: text("blob_key").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    azureMetadata: jsonb("azure_metadata").default({}).notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_versions_document_idx").on(table.documentId),
  }),
);

export const documentIntegrityEvents = pgTable(
  "document_integrity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentIdx: index("document_integrity_events_document_idx").on(table.documentId),
  }),
);

export const lenderRequiredDocuments = pgTable(
  "lender_required_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
      .references(() => lenderProducts.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").default("general").notNull(),
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lenderProductIdx: index("lender_required_documents_product_idx").on(table.lenderProductId),
  }),
);

export const requiredDocMap = pgTable(
  "required_doc_map",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderProductId: uuid("lender_product_id")
      .references(() => lenderProducts.id, { onDelete: "cascade" })
      .notNull(),
    requiredDocumentId: uuid("required_document_id")
      .references(() => lenderRequiredDocuments.id, { onDelete: "cascade" })
      .notNull(),
    isRequired: boolean("is_required").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    requiredDocIdx: index("required_doc_map_document_idx").on(table.requiredDocumentId),
  }),
);
