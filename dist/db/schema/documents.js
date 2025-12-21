"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredDocMap = exports.lenderRequiredDocuments = exports.documentIntegrityEvents = exports.documentVersions = exports.documents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const applications_1 = require("./applications");
const companies_1 = require("./companies");
const contacts_1 = require("./contacts");
const users_1 = require("./users");
const lenderProducts_1 = require("./lenderProducts");
exports.documents = (0, pg_core_1.pgTable)("documents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)("application_id").references(() => applications_1.applications.id, { onDelete: "set null" }),
    companyId: (0, pg_core_1.uuid)("company_id").references(() => companies_1.companies.id, { onDelete: "set null" }),
    contactId: (0, pg_core_1.uuid)("contact_id").references(() => contacts_1.contacts.id, { onDelete: "set null" }),
    fileName: (0, pg_core_1.text)("file_name").notNull(),
    mimeType: (0, pg_core_1.text)("mime_type").notNull(),
    blobKey: (0, pg_core_1.text)("blob_key").notNull(),
    checksumSha256: (0, pg_core_1.text)("checksum_sha256").notNull(),
    version: (0, pg_core_1.integer)("version").default(1).notNull(),
    sizeBytes: (0, pg_core_1.integer)("size_bytes").notNull(),
    uploadedByUserId: (0, pg_core_1.uuid)("uploaded_by_user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    uploadedBy: (0, pg_core_1.uuid)("uploaded_by").references(() => users_1.users.id, { onDelete: "set null" }),
    lastValidatedAt: (0, pg_core_1.timestamp)("last_validated_at", { withTimezone: true }),
    missingFlag: (0, pg_core_1.boolean)("missing_flag").default(false).notNull(),
    restoredFlag: (0, pg_core_1.boolean)("restored_flag").default(false).notNull(),
    azureMetadata: (0, pg_core_1.jsonb)("azure_metadata").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    applicationIdx: (0, pg_core_1.index)("documents_application_idx").on(table.applicationId),
    checksumIdx: (0, pg_core_1.index)("documents_checksum_idx").on(table.checksumSha256),
}));
exports.documentVersions = (0, pg_core_1.pgTable)("document_versions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    documentId: (0, pg_core_1.uuid)("document_id").references(() => exports.documents.id, { onDelete: "cascade" }).notNull(),
    versionNumber: (0, pg_core_1.integer)("version_number").default(1).notNull(),
    blobKey: (0, pg_core_1.text)("blob_key").notNull(),
    checksumSha256: (0, pg_core_1.text)("checksum_sha256").notNull(),
    sizeBytes: (0, pg_core_1.integer)("size_bytes").notNull(),
    azureMetadata: (0, pg_core_1.jsonb)("azure_metadata").default({}).notNull(),
    isCurrent: (0, pg_core_1.boolean)("is_current").default(true).notNull(),
    uploadedByUserId: (0, pg_core_1.uuid)("uploaded_by_user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    documentIdx: (0, pg_core_1.index)("document_versions_document_idx").on(table.documentId),
}));
exports.documentIntegrityEvents = (0, pg_core_1.pgTable)("document_integrity_events", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    documentId: (0, pg_core_1.uuid)("document_id").references(() => exports.documents.id, { onDelete: "cascade" }).notNull(),
    eventType: (0, pg_core_1.text)("event_type").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    documentIdx: (0, pg_core_1.index)("document_integrity_events_document_idx").on(table.documentId),
}));
exports.lenderRequiredDocuments = (0, pg_core_1.pgTable)("lender_required_documents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    docCategory: (0, pg_core_1.text)("doc_category").notNull(),
    required: (0, pg_core_1.boolean)("required").default(true).notNull(),
    title: (0, pg_core_1.text)("title").default("Document").notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.text)("category").default("general").notNull(),
    isMandatory: (0, pg_core_1.boolean)("is_mandatory").default(true).notNull(),
    validationRules: (0, pg_core_1.jsonb)("validation_rules").default({}).notNull(),
    displayOrder: (0, pg_core_1.integer)("display_order").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    lenderProductIdx: (0, pg_core_1.index)("lender_required_documents_product_idx").on(table.lenderProductId),
}));
exports.requiredDocMap = (0, pg_core_1.pgTable)("required_doc_map", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    lenderProductId: (0, pg_core_1.uuid)("lender_product_id")
        .references(() => lenderProducts_1.lenderProducts.id, { onDelete: "cascade" })
        .notNull(),
    requiredDocumentId: (0, pg_core_1.uuid)("required_document_id")
        .references(() => exports.lenderRequiredDocuments.id, { onDelete: "cascade" })
        .notNull(),
    isRequired: (0, pg_core_1.boolean)("is_required").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
    requiredDocIdx: (0, pg_core_1.index)("required_doc_map_document_idx").on(table.requiredDocumentId),
}));
