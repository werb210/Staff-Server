export type LenderProductRecord = {
  id: string;
  lender_id: string;
  name: string;
  description: string | null;
  active: boolean;
  required_documents: any[];
  created_at: Date;
  updated_at: Date;
};
