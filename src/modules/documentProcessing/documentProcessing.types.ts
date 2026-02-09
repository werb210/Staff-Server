export type ProcessingJobStatus = "pending" | "processing" | "completed" | "failed";

export type DocumentProcessingJobType = "ocr";

export type DocumentProcessingJobRecord = {
  id: string;
  document_id: string;
  job_type: DocumentProcessingJobType;
  status: ProcessingJobStatus;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

export type BankingAnalysisJobRecord = {
  id: string;
  application_id: string;
  status: ProcessingJobStatus;
  statement_months_detected: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};
