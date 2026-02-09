export type ApplicationRecord = {
  id: string;
  owner_user_id: string | null;
  name: string;
  metadata: unknown | null;
  product_type: string;
  product_category: string | null;
  pipeline_state: string;
  current_stage: string | null;
  status: string;
  processing_stage: string;
  lender_id: string | null;
  lender_product_id: string | null;
  requested_amount: number | null;
  source: string | null;
  submission_key: string | null;
  external_id: string | null;
  client_submission_id: string | null;
  first_opened_at: Date | null;
  ocr_completed_at: Date | null;
  banking_completed_at: Date | null;
  credit_summary_completed_at: Date | null;
  startup_flag: boolean | null;
  created_at: Date;
  updated_at: Date;
};

export const APPLICATIONS_PARTIAL_UNIQUE_INDEXES = [
  {
    name: "applications_submission_key_unique",
    columns: ["submission_key"],
    where: "submission_key is not null",
  },
  {
    name: "applications_external_id_unique",
    columns: ["external_id"],
    where: "external_id is not null",
  },
  {
    name: "applications_client_submission_id_unique",
    columns: ["client_submission_id"],
    where: "client_submission_id is not null",
  },
] as const;
