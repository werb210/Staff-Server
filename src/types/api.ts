export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "review"
  | "approved"
  | "rejected";

export interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  loanAmount: number;
  loanPurpose: string;
  status: "draft" | "submitted" | "review" | "approved" | "completed";
  score?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
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
  fileContent: string; // base64 encoded
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType?: string;
  status: DocumentStatus;
  uploadedAt: string;
  fileName: string;
  checksum: string;
  blobUrl: string;
  sasUrl?: string;
  aiSummary?: string;
  explainability?: Record<string, string>;
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
  message: string;
  sentAt: string;
  status: "queued" | "sent";
}

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
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
