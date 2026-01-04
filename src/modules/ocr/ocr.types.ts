export type OcrJobStatus = "queued" | "processing" | "succeeded" | "failed" | "canceled";

export type OcrJobRecord = {
  id: string;
  document_id: string;
  application_id: string;
  status: OcrJobStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: Date | null;
  locked_at: Date | null;
  locked_by: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type OcrResultRecord = {
  id: string;
  document_id: string;
  provider: string;
  model: string;
  extracted_text: string;
  extracted_json: unknown | null;
  meta: unknown | null;
  created_at: Date;
  updated_at: Date;
};
