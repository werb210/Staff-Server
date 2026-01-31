export const LENDER_SUBMISSION_METHODS = ["EMAIL", "API"] as const;

export const LENDER_COUNTRIES = ["CA", "US", "CA_US"] as const;

export type LenderCountry = (typeof LENDER_COUNTRIES)[number];

export type LenderSubmissionMethod = (typeof LENDER_SUBMISSION_METHODS)[number];

export type LenderRecord = {
  id: string;
  name: string;
  status?: string;
  active: boolean;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  silo?: string | null;
  postal_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  submission_method: LenderSubmissionMethod | null;
  submission_email: string | null;
  created_at: Date;
};
