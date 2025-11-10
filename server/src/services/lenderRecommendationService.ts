import { logDebug, logInfo } from "../utils/logger.js";
import type { Application } from "../types/application.js";
import type { LenderProduct } from "../types/lenderProduct.js";

export async function recommendLenders(application: Application): Promise<LenderProduct[]> {
  logInfo("recommendLenders invoked");
  logDebug("recommendLenders payload", { application });
  return [
    {
      id: "LENDER-001",
      lenderId: "LEND-ALPHA",
      name: "Alpha Prime Loan",
      description: "Preferred lender program",
      interestRate: 5.25,
      maxAmount: 500000,
      termMonths: 60
    }
  ];
}

export async function scoreLenderMatch(application: Application, product: LenderProduct): Promise<number> {
  logInfo("scoreLenderMatch invoked");
  logDebug("scoreLenderMatch payload", { applicationId: application.id, productId: product.id });
  return Math.random();
}
