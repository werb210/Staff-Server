export type PreApplicationRecord = {
  id: string;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  years_in_business: string | null;
  annual_revenue: string | null;
  monthly_revenue: string | null;
  requested_amount: string | null;
  credit_score_range: string | null;
  ai_score: string | null;
  consumed: boolean;
  created_at: Date;
};
