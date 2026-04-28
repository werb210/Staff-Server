// BF_AZURE_OCR_TERMSHEET_v44 — extracted banking analysis logic so the
// auto-worker can call it without going through the HTTP route.
export interface BankingAnalysisInput {
  applicationId: string;
  transactions: Array<{ balance?: number | string; credit?: number | string; type?: string }>;
}

export interface BankingAnalysisResult {
  applicationId: string;
  avg_balance: number;
  nsf_count: number;
  monthly_revenue: number;
  revenue_trend: "up" | "down";
}

export function analyzeBankStatements(input: BankingAnalysisInput): BankingAnalysisResult {
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];
  const balances = transactions.map((t) => Number(t?.balance)).filter((n) => Number.isFinite(n));
  const deposits = transactions.map((t) => Number(t?.credit)).filter((n) => Number.isFinite(n) && n > 0);
  const nsfCount = transactions.filter((t) => String(t?.type ?? "").toLowerCase().includes("nsf")).length;
  const avgBalance = balances.length ? balances.reduce((a, b) => a + b, 0) / balances.length : 0;
  const monthlyRevenue = deposits.reduce((a, b) => a + b, 0);
  const midpoint = Math.floor(deposits.length / 2) || 1;
  const firstHalf = deposits.slice(0, midpoint).reduce((a, b) => a + b, 0);
  const secondHalf = deposits.slice(midpoint).reduce((a, b) => a + b, 0);
  return {
    applicationId: input.applicationId,
    avg_balance: Number(avgBalance.toFixed(2)),
    nsf_count: nsfCount,
    monthly_revenue: Number(monthlyRevenue.toFixed(2)),
    revenue_trend: secondHalf >= firstHalf ? "up" : "down",
  };
}
