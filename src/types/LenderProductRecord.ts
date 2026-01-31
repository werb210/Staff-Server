import { type Eligibility, type RequiredDocuments } from "../db/schema/lenderProducts";

export type LenderProductRecord = {
  id: string;
  lender_id: string;
  lender_name?: string | null;
  name: string;
  description: string | null;
  active: boolean;
  type?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
  status?: string | null;
  country?: string | null;
  rate_type?: string | null;
  min_rate?: string | null;
  max_rate?: string | null;
  required_documents: RequiredDocuments;
  eligibility: Eligibility;
  created_at: Date;
  updated_at: Date;
};
