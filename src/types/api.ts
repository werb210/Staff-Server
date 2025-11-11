export type DocumentStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected";

export interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  loanAmount: number;
  loanPurpose: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  stage?: string;
}

export interface DocumentUploadInput {
  applicationId: string;
  documentType: string;
  fileName: string;
  fileContent: string; // base64 encoded
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: string;
  status: DocumentStatus;
  uploadedAt: string;
  fileName: string;
}

export interface LenderProduct {
  id: string;
  lenderId: string;
  name: string;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
  terms?: string;
  active: boolean;
}

export interface Lender {
  id: string;
  name: string;
  contactEmail: string;
  products?: LenderProduct[];
  status?: string;
}

export interface SmsMessage {
  id: string;
  to: string;
  from: string;
  message: string;
  sentAt: string;
  status: string;
}

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: string;
}

export interface CallLog {
  id: string;
  to: string;
  from: string;
  durationSeconds: number;
  startedAt: string;
  notes?: string;
  outcome: string;
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
  applications: Application[];
}

export interface PipelineBoardData {
  stages: PipelineStage[];
}

export interface HealthStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  checkedAt: string;
  details?: Record<string, unknown>;
}
