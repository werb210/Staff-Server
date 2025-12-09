import { relations } from "drizzle-orm";
import { aiTrainingChunks } from "./aiTrainingChunks.js";
import { applicantOwners } from "./applicantOwners.js";
import { applications } from "./applications.js";
import { applicationStatusHistory } from "./applicationStatusHistory.js";
import { authSessions } from "./authSessions.js";
import { auditLogs } from "./audit.js";
import { bankingAnalysis } from "./banking.js";
import { businessInfo } from "./businessInfo.js";
import { communications } from "./messages.js";
import { documentVersions } from "./documentVersions.js";
import { dynamicQuestions } from "./dynamicQuestions.js";
import { lenderProducts } from "./products.js";
import { lenderRequiredDocuments } from "./lenderRequiredDocuments.js";
import { marketingEvents } from "./marketingEvents.js";
import { ocrResults } from "./ocr.js";
import { roles } from "./roles.js";
import { tasks } from "./tasks.js";
import { transmissionLogs } from "./transmissionLogs.js";
import { uploadedDocuments } from "./documents.js";
import { users } from "./users.js";

export const roleRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const userRelations = relations(users, ({ many, one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  applications: many(applications),
  assignedApplications: many(applications, {
    relationName: "applications_assigned",
  }),
  authSessions: many(authSessions),
  communicationsSent: many(communications, {
    relationName: "communications_sender",
  }),
  communicationsReceived: many(communications, {
    relationName: "communications_recipient",
  }),
  tasksAssigned: many(tasks, { relationName: "tasks_assignee" }),
  tasksCreated: many(tasks, { relationName: "tasks_creator" }),
  auditLogs: many(auditLogs),
  uploads: many(uploadedDocuments, { relationName: "documents_uploaded_by" }),
}));

export const applicationRelations = relations(applications, ({ many, one }) => ({
  applicant: one(users, {
    fields: [applications.applicantUserId],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [applications.assignedToUserId],
    references: [users.id],
    relationName: "applications_assigned",
  }),
  lenderProduct: one(lenderProducts, {
    fields: [applications.lenderProductId],
    references: [lenderProducts.id],
  }),
  businessInfo: one(businessInfo, {
    fields: [applications.id],
    references: [businessInfo.applicationId],
  }),
  owners: many(applicantOwners),
  statusHistory: many(applicationStatusHistory),
  requiredQuestions: many(dynamicQuestions),
  documents: many(uploadedDocuments),
  bankingAnalysis: many(bankingAnalysis),
  communications: many(communications),
  tasks: many(tasks),
  aiTrainingChunks: many(aiTrainingChunks),
  marketingEvents: many(marketingEvents),
}));

export const businessInfoRelations = relations(businessInfo, ({ one }) => ({
  application: one(applications, {
    fields: [businessInfo.applicationId],
    references: [applications.id],
  }),
}));

export const applicantOwnerRelations = relations(applicantOwners, ({ one, many }) => ({
  application: one(applications, {
    fields: [applicantOwners.applicationId],
    references: [applications.id],
  }),
  uploadedDocuments: many(uploadedDocuments),
}));

export const applicationStatusHistoryRelations = relations(
  applicationStatusHistory,
  ({ one }) => ({
    application: one(applications, {
      fields: [applicationStatusHistory.applicationId],
      references: [applications.id],
    }),
    changedBy: one(users, {
      fields: [applicationStatusHistory.changedByUserId],
      references: [users.id],
    }),
  }),
);

export const lenderProductRelations = relations(lenderProducts, ({ many }) => ({
  requiredDocuments: many(lenderRequiredDocuments),
  applications: many(applications),
  dynamicQuestions: many(dynamicQuestions),
}));

export const lenderRequiredDocumentsRelations = relations(
  lenderRequiredDocuments,
  ({ one, many }) => ({
    lenderProduct: one(lenderProducts, {
      fields: [lenderRequiredDocuments.lenderProductId],
      references: [lenderProducts.id],
    }),
    uploadedDocuments: many(uploadedDocuments),
  }),
);

export const dynamicQuestionRelations = relations(dynamicQuestions, ({ one }) => ({
  lenderProduct: one(lenderProducts, {
    fields: [dynamicQuestions.lenderProductId],
    references: [lenderProducts.id],
  }),
  application: one(applications, {
    fields: [dynamicQuestions.applicationId],
    references: [applications.id],
  }),
}));

export const uploadedDocumentRelations = relations(uploadedDocuments, ({ one, many }) => ({
  application: one(applications, {
    fields: [uploadedDocuments.applicationId],
    references: [applications.id],
  }),
  owner: one(applicantOwners, {
    fields: [uploadedDocuments.ownerId],
    references: [applicantOwners.id],
  }),
  requiredDocument: one(lenderRequiredDocuments, {
    fields: [uploadedDocuments.requiredDocumentId],
    references: [lenderRequiredDocuments.id],
  }),
  versions: many(documentVersions),
  uploader: one(users, {
    fields: [uploadedDocuments.uploadedByUserId],
    references: [users.id],
    relationName: "documents_uploaded_by",
  }),
}));

export const documentVersionRelations = relations(documentVersions, ({ one, many }) => ({
  document: one(uploadedDocuments, {
    fields: [documentVersions.documentId],
    references: [uploadedDocuments.id],
  }),
  createdBy: one(users, {
    fields: [documentVersions.createdByUserId],
    references: [users.id],
  }),
  ocrResults: many(ocrResults),
}));

export const ocrResultRelations = relations(ocrResults, ({ one }) => ({
  documentVersion: one(documentVersions, {
    fields: [ocrResults.documentVersionId],
    references: [documentVersions.id],
  }),
}));

export const bankingAnalysisRelations = relations(bankingAnalysis, ({ one }) => ({
  application: one(applications, {
    fields: [bankingAnalysis.applicationId],
    references: [applications.id],
  }),
}));

export const communicationRelations = relations(communications, ({ one, many }) => ({
  application: one(applications, {
    fields: [communications.applicationId],
    references: [applications.id],
  }),
  sender: one(users, {
    fields: [communications.senderUserId],
    references: [users.id],
    relationName: "communications_sender",
  }),
  recipient: one(users, {
    fields: [communications.recipientUserId],
    references: [users.id],
    relationName: "communications_recipient",
  }),
  transmissionLogs: many(transmissionLogs),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  application: one(applications, {
    fields: [tasks.applicationId],
    references: [applications.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeUserId],
    references: [users.id],
    relationName: "tasks_assignee",
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
    relationName: "tasks_creator",
  }),
}));

export const authSessionRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const aiTrainingChunkRelations = relations(aiTrainingChunks, ({ one }) => ({
  application: one(applications, {
    fields: [aiTrainingChunks.applicationId],
    references: [applications.id],
  }),
}));

export const marketingEventRelations = relations(marketingEvents, ({ one }) => ({
  application: one(applications, {
    fields: [marketingEvents.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [marketingEvents.userId],
    references: [users.id],
  }),
}));

export const transmissionLogRelations = relations(transmissionLogs, ({ one }) => ({
  communication: one(communications, {
    fields: [transmissionLogs.communicationId],
    references: [communications.id],
  }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
