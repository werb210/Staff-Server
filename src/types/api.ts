export type DocumentStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  productId: string;
  loanAmount: number;
  loanPurpose: string;
  status: "draft" | "submitted" | "review" | "approved" | "completed";
  score?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  submittedBy?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface ApplicationSummary {
  id: string;
  applicantName: string;
  loanAmount: number;
  loanPurpose: string;
  status: Application["status"];
  score?: number;
  submittedAt?: string;
  summary?: string;
}

export interface DocumentUploadInput {
  applicationId: string;
  documentId: string;
  documentType?: string;
  fileName: string;
  fileContent: string; // base64 encoded for stub uploads
  contentType?: string;
  note?: string;
  uploadedBy?: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType?: string;
  status: DocumentStatus;
  uploadedAt: string;
  uploadedBy?: string;
  note?: string;
  version: number;
  fileName: string;
  checksum: string;
  blobUrl: string;
  sasUrl?: string;
  aiSummary?: string;
  explainability?: Record<string, string>;
  versionHistory: DocumentVersion[];
}

export interface DocumentVersion {
  version: number;
  uploadedAt: string;
  checksum: string;
  blobUrl: string;
  sasUrl: string;
  uploadedBy?: string;
  note?: string;
}

export interface LenderProduct {
  id: string;
  lenderId: string;
  name: string;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
  termMonths: number;
  documentation: { documentType: string; required: boolean; description: string }[];
  recommendedScore: number;
  active: boolean;
}

export interface Lender {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  products?: LenderProduct[];
  status?: "active" | "paused" | "onboarding";
  rating?: number;
}

export interface SmsMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
  direction: "inbound" | "outbound";
}

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
  direction: "inbound" | "outbound";
}

export interface CallLog {
  id: string;
  to: string;
  from: string;
  durationSeconds: number;
  createdAt: string;
  notes?: string;
  outcome: "completed" | "no-answer" | "busy";
}

export interface BackupRecord {
  id: string;
  status: "scheduled" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface RetryJob {
  id: string;
  queue: string;
  attempt: number;
  status: "queued" | "running" | "failed" | "completed";
  lastError?: string;
  scheduledFor: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  count: number;
  totalLoanAmount: number;
  averageScore?: number;
  lastUpdatedAt: string;
  applications: Application[];
}

export interface PipelineBoardData {
  stages: PipelineStage[];
  assignments: PipelineAssignment[];
}

export interface PipelineAssignment {
  id: string;
  assignedTo: string;
  stage?: Application["status"];
  assignedAt: string;
  note?: string;
}

export interface HealthStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  checkedAt: string;
  details?: Record<string, unknown>;
}

export interface SmsThread {
  contact: string;
  messages: SmsMessage[];
}

export interface EmailThread {
  contact: string;
  messages: EmailMessage[];
}

export interface MarketingItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  channel: string;
  spend: number;
  lastUpdatedAt: string;
}

export interface ClientPortalSession {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  status: Application["status"];
  redirectUrl: string;
  nextStep: string;
  updatedAt: string;
  silo: string;
  message: string;
}
