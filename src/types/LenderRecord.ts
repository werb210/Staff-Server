export type LenderRecord = {
  id: string;
  name: string;
  active: boolean;
  website: string | null;
  country: string;
  status: string;
  api_config: Record<string, unknown> | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  submission_method: string;
  submission_email: string | null;
  created_at: Date;
  updated_at: Date;
};
