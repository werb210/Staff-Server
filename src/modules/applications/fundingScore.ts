// ---- Predictive Funding Engine ----

export interface FundingScoreResult {
  probability: number; // 0-100
  expectedCommission: number;
  priorityTier: "high" | "medium" | "low";
}

export const calculateFundingScore = (application: any): FundingScoreResult => {
  let score = 0;

  const amount = Number(
    application.requestedAmount ??
      application.requested_amount ??
      application?.productSelection?.capitalRequested ??
      0
  );
  if (amount > 500000) score += 30;
  else if (amount > 150000) score += 20;
  else score += 10;

  const underwritingReadiness =
    application.underwritingReadiness ??
    application?.metadata?.underwritingReadiness ??
    application?.metadata?.financialProfile?.underwritingReadiness ??
    null;
  if (underwritingReadiness === "ready") score += 30;
  else if (underwritingReadiness === "partial") score += 15;

  const creditScore = Number(
    application.creditScore ??
      application?.metadata?.creditScore ??
      application?.metadata?.financialProfile?.creditScore ??
      0
  );
  if (creditScore >= 720) score += 25;
  else if (creditScore >= 650) score += 15;

  const lowerIndustry = String(
    application.industry ??
      application?.metadata?.industry ??
      application?.metadata?.business?.industry ??
      ""
  ).toLowerCase();
  if (lowerIndustry.includes("construction")) score += 5;
  if (lowerIndustry.includes("retail")) score -= 5;

  const probability = Math.min(score, 95);

  const COMMISSION_RATE = 0.03;
  const expectedCommission = amount * COMMISSION_RATE * (probability / 100);

  const priorityTier =
    expectedCommission > 15000
      ? "high"
      : expectedCommission > 5000
        ? "medium"
        : "low";

  return {
    probability,
    expectedCommission,
    priorityTier,
  };
};
