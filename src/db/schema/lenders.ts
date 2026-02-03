export const LENDER_SUBMISSION_METHODS = [
  "EMAIL",
  "API",
  "GOOGLE_SHEETS",
  "MANUAL",
] as const;

export const LENDER_COUNTRIES = ["CA", "US", "BOTH"] as const;

export const LENDER_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type LenderCountry = (typeof LENDER_COUNTRIES)[number];

export type LenderSubmissionMethod = (typeof LENDER_SUBMISSION_METHODS)[number];

export type LenderStatus = (typeof LENDER_STATUSES)[number];

export type LenderRecord = {
  id: string;
  name: string;
  status: LenderStatus;
  active: boolean;
  website: string | null;
  country: LenderCountry;
  submission_method: LenderSubmissionMethod;
  submission_email: string | null;
  api_config: Record<string, unknown> | null;
  submission_config: Record<string, unknown> | null;
  google_sheet_id: string | null;
  google_sheet_tab: string | null;
  google_sheet_mapping: Record<string, unknown> | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  created_at: Date;
  updated_at: Date;
};
