export const LENDER_SUBMISSION_METHODS = ["EMAIL", "API"] as const;

export type LenderSubmissionMethod = (typeof LENDER_SUBMISSION_METHODS)[number];

export type LenderRecord = {
  id: string;
  name: string;
  active: boolean;
  phone: string | null;
  website: string | null;
  description: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  country: string;
  postal_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  submission_method: LenderSubmissionMethod | null;
  submission_email: string | null;
  created_at: Date;
};
