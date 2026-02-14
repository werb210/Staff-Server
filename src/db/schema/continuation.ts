export type ContinuationRecord = {
  id: string;
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  industry: string;
  years_in_business: string | null;
  monthly_revenue: string | null;
  annual_revenue: string | null;
  ar_outstanding: string | null;
  existing_debt: string | null;
  used_in_application: boolean;
  created_at: Date;
};
