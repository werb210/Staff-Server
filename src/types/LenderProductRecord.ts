export type LenderProductRecord = {
  id: string;
  lender_id: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: string[];
  created_at: Date;
  updated_at: Date;
};
