export interface LenderProduct {
  id: string;
  lenderId: string;
  name: string;
  description: string;
  interestRate: number;
  maxAmount: number;
  termMonths: number;
}
