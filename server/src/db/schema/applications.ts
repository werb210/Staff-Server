// server/src/db/schema/applications.ts
import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),

  // "in-progress" or "submitted"
  status: text('status').notNull(),

  // "Received", "In Review", "Documents Required", etc.
  pipelineStage: text('pipeline_stage').notNull(),

  // The full 7-step client application
  formData: jsonb('form_data').notNull(),

  // Track where the user left off
  currentStep: text('current_step').notNull(),

  // Link to staff-portal CRM user record
  applicantEmail: text('applicant_email').notNull(),

  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
