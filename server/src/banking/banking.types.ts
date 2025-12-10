import { z } from "zod";

export const BankingReprocessSchema = z.object({
  applicationId: z.string().uuid(),
  documentVersionIds: z.array(z.string().uuid()).min(1),
});

export type BankingReprocessRequest = z.infer<typeof BankingReprocessSchema> & { userId?: string };

export interface BankingTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
}

export interface BankingMetrics {
  averageMonthlyRevenue: number;
  averageMonthlyExpenses: number;
  burnRate: number;
  daysCashOnHand: number;
  nsfCount: number;
  monthToMonthRevenueTrend: number[];
  largestDeposits: number[];
  volatilityIndex: number;
}

export interface BankingAnalysisRecord {
  id: string;
  applicationId: string;
  metricsJson: BankingMetrics;
  monthlyJson: Record<string, BankingTransaction[]>;
  createdAt: Date;
}
