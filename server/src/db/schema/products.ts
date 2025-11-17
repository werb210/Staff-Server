// server/src/db/schema/products.ts

export interface LenderProduct {
  id: string;
  lenderId: string;

  name: string;            // “Working Capital Term Loan”
  productType: string;     // "term_loan", "loc", "factoring", "equipment"
  description: string;

  minAmount: number;
  maxAmount: number;
  rateMin: number;
  rateMax: number;
  termMinMonths: number;
  termMaxMonths: number;

  geography: ("CA" | "US")[];

  // Eligibility
  minCreditScore: number | null;
  minMonthlyRevenue: number | null;
  minYearsInBusiness: number | null;

  createdAt: Date;
  updatedAt: Date;
}
