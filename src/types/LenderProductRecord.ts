import { type Eligibility, type RequiredDocuments } from "../db/schema/lenderProducts";

export type LenderProductRecord = {
  id: string;
  lender_id: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: RequiredDocuments;
  eligibility: Eligibility;
  created_at: Date;
  updated_at: Date;
};
