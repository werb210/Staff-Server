import {
  aiTrainingChunks,
  applicantOwners,
  applications,
  applicationStatusHistory,
  authSessions,
  auditLogs,
  bankingAnalysis,
  businessInfo,
  communications,
  documentVersions,
  dynamicQuestions,
  lenderProducts,
  lenderRequiredDocuments,
  marketingEvents,
  roles,
  tasks,
  transmissionLogs,
  uploadedDocuments,
  users,
} from "./schema/index.js";

export type AiTrainingChunk = typeof aiTrainingChunks.$inferSelect;
export type ApplicantOwner = typeof applicantOwners.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationStatusHistory = typeof applicationStatusHistory.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type BankingAnalysis = typeof bankingAnalysis.$inferSelect;
export type BusinessInfo = typeof businessInfo.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type DynamicQuestion = typeof dynamicQuestions.$inferSelect;
export type LenderProduct = typeof lenderProducts.$inferSelect;
export type LenderRequiredDocument = typeof lenderRequiredDocuments.$inferSelect;
export type MarketingEvent = typeof marketingEvents.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TransmissionLog = typeof transmissionLogs.$inferSelect;
export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type User = typeof users.$inferSelect;
