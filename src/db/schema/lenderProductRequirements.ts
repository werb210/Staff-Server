export type LenderProductRequirementRecord = {
  id: string;
  lender_product_id: string;
  document_type: string;
  required: boolean;
  min_amount: number | null;
  max_amount: number | null;
  created_at: Date;
};
