import { z } from "zod";
import {
  aiTrainingSourceEnum,
  applicationStageEnum,
  applicationStatusEnum,
  bankingAnalysisStatusEnum,
  businessEntityTypeEnum,
  auditActionEnum,
  communicationDirectionEnum,
  communicationTypeEnum,
  documentCategoryEnum,
  documentStatusEnum,
  marketingEventTypeEnum,
  ocrStatusEnum,
  ownerRoleEnum,
  productTypeEnum,
  questionTypeEnum,
  taskPriorityEnum,
  taskStatusEnum,
  transmissionChannelEnum,
  transmissionStatusEnum,
  userStatusEnum,
  userTypeEnum,
} from "./schema/enums.js";

const uuidSchema = () => z.string().uuid();
const nullableString = () => z.string().min(1).optional();
const monetary = () => z.coerce.number().optional();
const jsonValue = () => z.any().optional();
const enumFrom = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

export const createRoleSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const createUserSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  userType: enumFrom(userTypeEnum.enumValues).optional(),
  status: enumFrom(userStatusEnum.enumValues).optional(),
  roleId: uuidSchema(),
  timezone: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const createAuthSessionSchema = z.object({
  userId: uuidSchema(),
  token: z.string().min(1),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  expiresAt: z.coerce.date(),
});

export const updateAuthSessionSchema = createAuthSessionSchema.partial();

export const createApplicationSchema = z.object({
  referenceCode: z.string().min(1),
  applicantUserId: uuidSchema().optional(),
  assignedToUserId: uuidSchema().optional(),
  lenderProductId: uuidSchema().optional(),
  status: enumFrom(applicationStatusEnum.enumValues).optional(),
  stage: enumFrom(applicationStageEnum.enumValues).optional(),
  requestedAmount: monetary(),
  desiredProductType: enumFrom(productTypeEnum.enumValues).optional(),
  currentStep: z.string().optional(),
  source: z.string().optional(),
  submittedAt: z.coerce.date().optional(),
  decisionAt: z.coerce.date().optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const createBusinessInfoSchema = z.object({
  applicationId: uuidSchema(),
  legalName: z.string().min(1),
  dbaName: z.string().optional(),
  entityType: enumFrom(businessEntityTypeEnum.enumValues),
  ein: z.string().optional(),
  industry: z.string().optional(),
  naicsCode: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  addressLine1: nullableString(),
  addressLine2: z.string().optional(),
  city: nullableString(),
  state: nullableString(),
  postalCode: nullableString(),
  country: nullableString(),
  yearEstablished: z.coerce.number().int().optional(),
  annualRevenue: monetary(),
  averageMonthlyRevenue: monetary(),
  employeeCount: z.coerce.number().int().optional(),
});

export const updateBusinessInfoSchema = createBusinessInfoSchema.partial();

export const createApplicantOwnerSchema = z.object({
  applicationId: uuidSchema(),
  ownerRole: enumFrom(ownerRoleEnum.enumValues).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  ssnLast4: z.string().optional(),
  ownershipPercentage: z.coerce.number().min(0).max(100),
  dateOfBirth: z.coerce.date().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const updateApplicantOwnerSchema = createApplicantOwnerSchema.partial();

export const createApplicationStatusHistorySchema = z.object({
  applicationId: uuidSchema(),
  status: enumFrom(applicationStatusEnum.enumValues),
  stage: enumFrom(applicationStageEnum.enumValues),
  note: z.string().optional(),
  changedByUserId: uuidSchema().optional(),
});

export const updateApplicationStatusHistorySchema = createApplicationStatusHistorySchema.partial();

export const createLenderProductSchema = z.object({
  lenderName: z.string().min(1),
  productName: z.string().min(1),
  productType: enumFrom(productTypeEnum.enumValues),
  minAmount: monetary(),
  maxAmount: monetary(),
  minRate: z.coerce.number().optional(),
  maxRate: z.coerce.number().optional(),
  termMonths: z.coerce.number().int().optional(),
  fees: z.array(z.any()).optional(),
  metadata: jsonValue(),
  isActive: z.boolean().optional(),
});

export const updateLenderProductSchema = createLenderProductSchema.partial();

export const createLenderRequiredDocumentSchema = z.object({
  lenderProductId: uuidSchema(),
  title: z.string().min(1),
  category: enumFrom(documentCategoryEnum.enumValues),
  description: z.string().optional(),
  isMandatory: z.boolean().optional(),
  allowsMultiple: z.boolean().optional(),
  instructions: z.string().optional(),
});

export const updateLenderRequiredDocumentSchema = createLenderRequiredDocumentSchema.partial();

export const createDynamicQuestionSchema = z.object({
  lenderProductId: uuidSchema().optional(),
  applicationId: uuidSchema().optional(),
  fieldKey: z.string().min(1),
  prompt: z.string().min(1),
  questionType: enumFrom(questionTypeEnum.enumValues),
  options: z.array(z.any()).optional(),
  isRequired: z.boolean().optional(),
  helperText: z.string().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateDynamicQuestionSchema = createDynamicQuestionSchema.partial();

export const createUploadedDocumentSchema = z.object({
  applicationId: uuidSchema(),
  ownerId: uuidSchema().optional(),
  requiredDocumentId: uuidSchema().optional(),
  documentType: enumFrom(documentCategoryEnum.enumValues).optional(),
  status: enumFrom(documentStatusEnum.enumValues).optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  storagePath: z.string().min(1),
  uploadedByUserId: uuidSchema().optional(),
  uploadedAt: z.coerce.date().optional(),
});

export const updateUploadedDocumentSchema = createUploadedDocumentSchema.partial();

export const createDocumentVersionSchema = z.object({
  documentId: uuidSchema(),
  versionNumber: z.coerce.number().int().optional(),
  storagePath: z.string().min(1),
  checksum: z.string().optional(),
  isCurrent: z.boolean().optional(),
  createdByUserId: uuidSchema().optional(),
});

export const updateDocumentVersionSchema = createDocumentVersionSchema.partial();

export const createOcrResultSchema = z.object({
  documentVersionId: uuidSchema(),
  status: enumFrom(ocrStatusEnum.enumValues).optional(),
  rawText: z.string().optional(),
  extractedData: z.any().optional(),
  error: z.string().optional(),
  processedAt: z.coerce.date().optional(),
});

export const updateOcrResultSchema = createOcrResultSchema.partial();

export const createBankingAnalysisSchema = z.object({
  applicationId: uuidSchema(),
  institutionName: z.string().optional(),
  reportPeriodStart: z.coerce.date().optional(),
  reportPeriodEnd: z.coerce.date().optional(),
  averageDailyBalance: monetary(),
  totalDeposits: monetary(),
  totalWithdrawals: monetary(),
  nsfCount: z.coerce.number().int().optional(),
  riskScore: z.coerce.number().int().optional(),
  status: enumFrom(bankingAnalysisStatusEnum.enumValues).optional(),
  summary: z.string().optional(),
  metrics: jsonValue(),
});

export const updateBankingAnalysisSchema = createBankingAnalysisSchema.partial();

export const createCommunicationSchema = z.object({
  applicationId: uuidSchema().optional(),
  senderUserId: uuidSchema().optional(),
  recipientUserId: uuidSchema().optional(),
  type: enumFrom(communicationTypeEnum.enumValues),
  direction: enumFrom(communicationDirectionEnum.enumValues),
  message: z.string().min(1),
  metadata: jsonValue(),
  externalId: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
});

export const updateCommunicationSchema = createCommunicationSchema.partial();

export const createTaskSchema = z.object({
  applicationId: uuidSchema().optional(),
  assigneeUserId: uuidSchema().optional(),
  createdByUserId: uuidSchema().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: enumFrom(taskStatusEnum.enumValues).optional(),
  priority: enumFrom(taskPriorityEnum.enumValues).optional(),
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createAiTrainingChunkSchema = z.object({
  applicationId: uuidSchema().optional(),
  sourceType: enumFrom(aiTrainingSourceEnum.enumValues),
  sourceId: z.string().optional(),
  content: z.string().min(1),
  embedding: z.any().optional(),
  metadata: jsonValue(),
});

export const updateAiTrainingChunkSchema = createAiTrainingChunkSchema.partial();

export const createMarketingEventSchema = z.object({
  applicationId: uuidSchema().optional(),
  userId: uuidSchema().optional(),
  eventType: enumFrom(marketingEventTypeEnum.enumValues),
  payload: jsonValue(),
  referrer: z.string().optional(),
  campaign: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
});

export const updateMarketingEventSchema = createMarketingEventSchema.partial();

export const createTransmissionLogSchema = z.object({
  communicationId: uuidSchema().optional(),
  channel: enumFrom(transmissionChannelEnum.enumValues),
  status: enumFrom(transmissionStatusEnum.enumValues).optional(),
  requestPayload: z.any().optional(),
  responsePayload: z.any().optional(),
  externalId: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
});

export const updateTransmissionLogSchema = createTransmissionLogSchema.partial();

export const createAuditLogSchema = z.object({
  userId: uuidSchema().optional(),
  action: enumFrom(auditActionEnum.enumValues),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  description: z.string().optional(),
  changes: z.any().optional(),
  metadata: z.any().optional(),
});

export const updateAuditLogSchema = createAuditLogSchema.partial();

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type CreateBusinessInfoInput = z.infer<typeof createBusinessInfoSchema>;
export type UpdateBusinessInfoInput = z.infer<typeof updateBusinessInfoSchema>;
export type CreateApplicantOwnerInput = z.infer<typeof createApplicantOwnerSchema>;
export type UpdateApplicantOwnerInput = z.infer<typeof updateApplicantOwnerSchema>;
export type CreateApplicationStatusHistoryInput = z.infer<
  typeof createApplicationStatusHistorySchema
>;
export type UpdateApplicationStatusHistoryInput = z.infer<
  typeof updateApplicationStatusHistorySchema
>;
export type CreateLenderProductInput = z.infer<typeof createLenderProductSchema>;
export type UpdateLenderProductInput = z.infer<typeof updateLenderProductSchema>;
export type CreateLenderRequiredDocumentInput = z.infer<
  typeof createLenderRequiredDocumentSchema
>;
export type UpdateLenderRequiredDocumentInput = z.infer<
  typeof updateLenderRequiredDocumentSchema
>;
export type CreateDynamicQuestionInput = z.infer<typeof createDynamicQuestionSchema>;
export type UpdateDynamicQuestionInput = z.infer<typeof updateDynamicQuestionSchema>;
export type CreateUploadedDocumentInput = z.infer<typeof createUploadedDocumentSchema>;
export type UpdateUploadedDocumentInput = z.infer<typeof updateUploadedDocumentSchema>;
export type CreateDocumentVersionInput = z.infer<typeof createDocumentVersionSchema>;
export type UpdateDocumentVersionInput = z.infer<typeof updateDocumentVersionSchema>;
export type CreateOcrResultInput = z.infer<typeof createOcrResultSchema>;
export type UpdateOcrResultInput = z.infer<typeof updateOcrResultSchema>;
export type CreateBankingAnalysisInput = z.infer<typeof createBankingAnalysisSchema>;
export type UpdateBankingAnalysisInput = z.infer<typeof updateBankingAnalysisSchema>;
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
export type UpdateCommunicationInput = z.infer<typeof updateCommunicationSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateAiTrainingChunkInput = z.infer<typeof createAiTrainingChunkSchema>;
export type UpdateAiTrainingChunkInput = z.infer<typeof updateAiTrainingChunkSchema>;
export type CreateMarketingEventInput = z.infer<typeof createMarketingEventSchema>;
export type UpdateMarketingEventInput = z.infer<typeof updateMarketingEventSchema>;
export type CreateTransmissionLogInput = z.infer<typeof createTransmissionLogSchema>;
export type UpdateTransmissionLogInput = z.infer<typeof updateTransmissionLogSchema>;
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type UpdateAuditLogInput = z.infer<typeof updateAuditLogSchema>;
export type CreateAuthSessionInput = z.infer<typeof createAuthSessionSchema>;
export type UpdateAuthSessionInput = z.infer<typeof updateAuthSessionSchema>;
