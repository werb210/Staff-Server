import { logDebug, logInfo } from "../utils/logger.js";
import type { Application } from "../types/application.js";
import type { LenderProduct } from "../types/lenderProduct.js";

const lenderCatalog: LenderProduct[] = [
  {
    id: "LENDER-001",
    lenderId: "LEND-ALPHA",
    name: "Alpha Prime Loan",
    description: "Preferred term loan with flexible draw schedule",
    interestRate: 5.25,
    maxAmount: 500000,
    termMonths: 60
  },
  {
    id: "LENDER-002",
    lenderId: "LEND-BRIDGE",
    name: "Bridge Express Working Capital",
    description: "Short-term bridge financing for seasonal inventory purchases",
    interestRate: 7.1,
    maxAmount: 150000,
    termMonths: 18
  },
  {
    id: "LENDER-003",
    lenderId: "LEND-SUMMIT",
    name: "Summit Equipment Lease",
    description: "Equipment-focused facility with minimal collateral requirements",
    interestRate: 6.4,
    maxAmount: 250000,
    termMonths: 36
  }
];

function calculateDocumentReadiness(application: Application): number {
  if (application.documents.length === 0) {
    return 0.5;
  }
  const received = application.documents.filter((document) => document.status === "received").length;
  return received / application.documents.length;
}

/**
 * Returns a ranked list of lenders suitable for the provided application.
 */
export async function recommendLenders(application: Application): Promise<LenderProduct[]> {
  logInfo("recommendLenders invoked");
  logDebug("recommendLenders payload", { applicationId: application.id, amount: application.amountRequested });
  const readiness = calculateDocumentReadiness(application);
  const scoredProducts = await Promise.all(
    lenderCatalog.map(async (product) => ({
      product,
      score: await scoreLenderMatch(application, product, readiness)
    }))
  );
  return scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ product, score }) => ({
      ...product,
      description: `${product.description} — match score ${(score * 100).toFixed(0)}%`
    }));
}

/**
 * Produces a relevance score for a given lender product relative to an application.
 */
export async function scoreLenderMatch(
  application: Application,
  product: LenderProduct,
  readinessOverride?: number
): Promise<number> {
  logInfo("scoreLenderMatch invoked");
  logDebug("scoreLenderMatch payload", { applicationId: application.id, productId: product.id });
  const readiness = readinessOverride ?? calculateDocumentReadiness(application);
  const amountRatio = application.amountRequested / product.maxAmount;
  const amountScore = amountRatio <= 1 ? amountRatio : Math.max(0, 1 - (amountRatio - 1));
  const termDifference = Math.abs(application.termMonths - product.termMonths);
  const termScore = Math.max(0, 1 - termDifference / Math.max(product.termMonths, 1));
  const statusScore = (() => {
    switch (application.status) {
      case "approved":
        return 1;
      case "submitted":
        return 0.85;
      case "draft":
        return 0.6;
      default:
        return 0.7;
    }
  })();
  const weightedScore = amountScore * 0.4 + termScore * 0.3 + readiness * 0.2 + statusScore * 0.1;
  return Number(Math.max(0, Math.min(1, weightedScore)).toFixed(4));
}
