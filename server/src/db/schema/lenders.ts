// server/src/db/schema/lenders.ts
import { pgTable, uuid, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

export const lenders = pgTable('lenders', {
  id: uuid('id').primaryKey().defaultRandom(),

  lenderName: text('lender_name').notNull(),

  // e.g. "LOC", "Term Loan", "Factoring"
  productCategory: text('product_category').notNull(),

  // JSON fields:
  // { min: 5000, max: 750000 }
  amountRange: jsonb('amount_range').notNull(),

  // e.g. "600+", "no minimum", etc.
  creditRequirements: text('credit_requirements'),

  // OCR/BANKING flags this lender cannot accept
  disqualifiers: jsonb('disqualifiers').notNull().default('{}'),

  // Required documents list
  requiredDocs: jsonb('required_docs').notNull(),

  // Is this lender “active”?
  active: boolean('active').default(true),

  createdAt: timestamp('created_at').defaultNow(),
});
