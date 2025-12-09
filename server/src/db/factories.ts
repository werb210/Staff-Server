import { randomUUID } from "crypto";
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
  ocrResults,
  roles,
  tasks,
  transmissionLogs,
  uploadedDocuments,
  users,
} from "./schema/index.js";
import {
  aiTrainingSourceEnum,
  applicationStageEnum,
  applicationStatusEnum,
  bankingAnalysisStatusEnum,
  businessEntityTypeEnum,
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

const unique = (prefix: string) => `${prefix}-${randomUUID()}`;
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

export const roleFactory = (): typeof roles.$inferInsert => ({
  code: unique("role"),
  name: "Role Name",
  description: "Test role",
  permissions: [],
  isDefault: false,
});

export const userFactory = (roleId: string): typeof users.$inferInsert => ({
  email: `${unique("user")}@example.com`,
  passwordHash: "hashed-password",
  firstName: "Test",
  lastName: "User",
  phone: "555-0000",
  userType: userTypeEnum.enumValues[0],
  status: userStatusEnum.enumValues[0],
  roleId,
  timezone: "UTC",
});

export const authSessionFactory = (userId: string): typeof authSessions.$inferInsert => ({
  userId,
  token: unique("token"),
  ipAddress: "127.0.0.1",
  userAgent: "jest",
  expiresAt: hoursFromNow(2),
});

export const lenderProductFactory = (): typeof lenderProducts.$inferInsert => ({
  lenderName: "Lender Co",
  productName: "Working Capital",
  productType: productTypeEnum.enumValues[0],
  minAmount: "10000",
  maxAmount: "50000",
  minRate: "0.05",
  maxRate: "0.25",
  termMonths: 12,
  fees: [],
  metadata: {},
  isActive: true,
});

export const applicationFactory = (
  lenderProductId?: string,
  applicantUserId?: string,
  assignedToUserId?: string,
): typeof applications.$inferInsert => ({
  referenceCode: unique("APP"),
  applicantUserId,
  assignedToUserId,
  lenderProductId,
  status: applicationStatusEnum.enumValues[0],
  stage: applicationStageEnum.enumValues[0],
  requestedAmount: "25000",
  desiredProductType: productTypeEnum.enumValues[0],
  currentStep: "business_info",
  source: "portal",
  submittedAt: new Date(),
});

export const businessInfoFactory = (
  applicationId: string,
): typeof businessInfo.$inferInsert => ({
  applicationId,
  legalName: "Test Business LLC",
  dbaName: "Test Biz",
  entityType: businessEntityTypeEnum.enumValues[0],
  ein: "12-3456789",
  industry: "Services",
  naicsCode: "541611",
  website: "https://example.com",
  phone: "555-1000",
  addressLine1: "123 Main St",
  city: "Metropolis",
  state: "NY",
  postalCode: "10001",
  country: "USA",
  yearEstablished: 2010,
  annualRevenue: "500000",
  averageMonthlyRevenue: "40000",
  employeeCount: 10,
});

export const applicantOwnerFactory = (applicationId: string): typeof applicantOwners.$inferInsert => ({
  applicationId,
  ownerRole: ownerRoleEnum.enumValues[0],
  firstName: "Jane",
  lastName: "Doe",
  email: `${unique("owner")}@example.com`,
  phone: "555-2000",
  ssnLast4: "1234",
  ownershipPercentage: "75.00",
  dateOfBirth: new Date("1990-01-01"),
  addressLine1: "456 Side St",
  city: "Metropolis",
  state: "NY",
  postalCode: "10001",
  country: "USA",
});

export const applicationStatusHistoryFactory = (
  applicationId: string,
  changedByUserId?: string,
): typeof applicationStatusHistory.$inferInsert => ({
  applicationId,
  status: applicationStatusEnum.enumValues[0],
  stage: applicationStageEnum.enumValues[0],
  note: "Initial submission",
  changedByUserId,
});

export const lenderRequiredDocumentFactory = (
  lenderProductId: string,
): typeof lenderRequiredDocuments.$inferInsert => ({
  lenderProductId,
  title: "Bank Statements",
  category: documentCategoryEnum.enumValues[1],
  description: "Last 3 months",
  isMandatory: true,
  allowsMultiple: true,
  instructions: "Upload PDFs",
});

export const dynamicQuestionFactory = (
  lenderProductId?: string,
  applicationId?: string,
): typeof dynamicQuestions.$inferInsert => ({
  lenderProductId,
  applicationId,
  fieldKey: unique("question"),
  prompt: "What is your monthly revenue?",
  questionType: questionTypeEnum.enumValues[0],
  options: [],
  isRequired: true,
  helperText: "Estimate is fine",
  position: 1,
});

export const uploadedDocumentFactory = (
  applicationId: string,
  uploadedByUserId?: string,
  requiredDocumentId?: string,
  ownerId?: string,
): typeof uploadedDocuments.$inferInsert => ({
  applicationId,
  ownerId,
  requiredDocumentId,
  documentType: documentCategoryEnum.enumValues[1],
  status: documentStatusEnum.enumValues[0],
  fileName: "statement.pdf",
  mimeType: "application/pdf",
  storagePath: `/uploads/${unique("doc")}.pdf`,
  uploadedByUserId,
  uploadedAt: new Date(),
});

export const documentVersionFactory = (
  documentId: string,
  createdByUserId?: string,
): typeof documentVersions.$inferInsert => ({
  documentId,
  versionNumber: 1,
  storagePath: `/uploads/${unique("version")}.pdf`,
  checksum: unique("checksum"),
  isCurrent: true,
  createdByUserId,
});

export const ocrResultFactory = (
  documentVersionId: string,
): typeof ocrResults.$inferInsert => ({
  documentVersionId,
  status: ocrStatusEnum.enumValues[0],
  rawText: "Extracted text",
  extractedData: {},
  error: null,
  processedAt: new Date(),
});

export const bankingAnalysisFactory = (
  applicationId: string,
): typeof bankingAnalysis.$inferInsert => ({
  applicationId,
  institutionName: "Bank of Example",
  reportPeriodStart: new Date("2024-01-01"),
  reportPeriodEnd: new Date("2024-03-31"),
  averageDailyBalance: "15000",
  totalDeposits: "90000",
  totalWithdrawals: "80000",
  nsfCount: 0,
  riskScore: 720,
  status: bankingAnalysisStatusEnum.enumValues[0],
  summary: "Stable cash flow",
  metrics: {},
});

export const communicationFactory = (
  applicationId?: string,
  senderUserId?: string,
  recipientUserId?: string,
): typeof communications.$inferInsert => ({
  applicationId,
  senderUserId,
  recipientUserId,
  type: communicationTypeEnum.enumValues[0],
  direction: communicationDirectionEnum.enumValues[0],
  message: "Test message",
  metadata: {},
  externalId: unique("comm"),
  occurredAt: new Date(),
});

export const taskFactory = (
  applicationId?: string,
  assigneeUserId?: string,
  createdByUserId?: string,
): typeof tasks.$inferInsert => ({
  applicationId,
  assigneeUserId,
  createdByUserId,
  title: "Collect documents",
  description: "Request latest bank statements",
  status: taskStatusEnum.enumValues[0],
  priority: taskPriorityEnum.enumValues[1],
  dueDate: hoursFromNow(48),
});

export const aiTrainingChunkFactory = (
  applicationId?: string,
): typeof aiTrainingChunks.$inferInsert => ({
  applicationId,
  sourceType: aiTrainingSourceEnum.enumValues[0],
  sourceId: unique("source"),
  content: "Example content chunk",
  embedding: [0.1, 0.2, 0.3],
  metadata: {},
});

export const marketingEventFactory = (
  applicationId?: string,
  userId?: string,
): typeof marketingEvents.$inferInsert => ({
  applicationId,
  userId,
  eventType: marketingEventTypeEnum.enumValues[0],
  payload: {},
  referrer: "https://example.com",
  campaign: "spring-promo",
  occurredAt: new Date(),
});

export const transmissionLogFactory = (
  communicationId?: string,
): typeof transmissionLogs.$inferInsert => ({
  communicationId,
  channel: transmissionChannelEnum.enumValues[0],
  status: transmissionStatusEnum.enumValues[0],
  requestPayload: {},
  responsePayload: {},
  externalId: unique("tx"),
  occurredAt: new Date(),
});

export const auditLogFactory = (
  userId?: string,
): typeof auditLogs.$inferInsert => ({
  userId,
  action: "create",
  entityType: "application",
  entityId: randomUUID(),
  description: "Created application",
  changes: {},
  metadata: {},
});
