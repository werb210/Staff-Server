// server/src/db/schema/documents.ts
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),

  applicationId: uuid('application_id').notNull(),

  originalName: text('original_name').notNull(),
  category: text('category'), // bank_statement, id, void_cheque, etc.
  mimeType: text('mime_type').notNull(),

  azureBlobKey: text('azure_blob_key').notNull(),

  checksum: text('checksum'),
  sizeBytes: integer('size_bytes'),

  uploadedAt: timestamp('uploaded_at').defaultNow(),

  // "pending" | "accepted" | "rejected"
  status: text('status').notNull().default('pending'),

  rejectionReason: text('rejection_reason'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
