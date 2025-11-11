import type { Application } from "../schemas/application.schema.js";
import type { DocumentMetadata } from "../schemas/document.schema.js";
import type { LenderProduct } from "../schemas/lenderProduct.schema.js";
import { createRecommendation, createSummary } from "../utils/aiHelpers.js";

export class AiService {
  public summarizeApplication(application: Application): string {
    return createSummary(
      `${application.applicantName} requesting ${application.loanAmount.toFixed(
        2,
      )} for ${application.loanPurpose}`,
    );
  }

  public summarizeDocument(document: Pick<DocumentMetadata, "fileName" | "ocrTextPreview">): string {
    const base = `Document ${document.fileName}`;
    const preview = document.ocrTextPreview ?? "Awaiting OCR extraction";
    return createSummary(`${base}: ${preview}`);
  }

  public scoreLenderMatch(
    product: LenderProduct,
    application: Application,
  ): { score: number; explanation: string } {
    const loanWithinRange =
      application.loanAmount >= product.minAmount &&
      application.loanAmount <= product.maxAmount;
    const baseScore = loanWithinRange ? 70 : 40;
    const adjustment = Math.max(0, 30 - Math.abs(product.interestRate - 6));
    const score = Math.min(100, baseScore + adjustment);
    return {
      score,
      explanation: createRecommendation(score),
    };
  }

  public buildDocumentExplainability(document: DocumentMetadata): Record<string, string> {
    return {
      checksum: document.checksum,
      status: document.status,
      blobUrl: document.blobUrl,
    };
  }
}

export const aiService = new AiService();

export type AiServiceType = AiService;

export const createAiService = (): AiService => new AiService();
