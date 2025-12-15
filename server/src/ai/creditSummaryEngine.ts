import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { applications, applicationTimelineEvents, creditSummaries } from "../db/schema";
import { AIEngine, AIProvider, EchoAIProvider } from "./aiEngine";

export interface CreditSummaryPayload {
  applicationId: string;
  userId?: string;
  context: Record<string, any>;
}

export interface CreditSummaryResult {
  version: number;
  summaryJson: Record<string, any>;
  pdfBlobKey: string;
}

interface CreditSummaryRepository {
  latestVersion(applicationId: string): Promise<number>;
  saveSummary(input: { applicationId: string; version: number; summaryJson: Record<string, any>; pdfBlobKey: string }):
    Promise<void>;
  updateApplicationVersion(applicationId: string, version: number): Promise<void>;
  logEvent(applicationId: string, eventType: string, metadata: Record<string, any>, userId?: string): Promise<void>;
}

class DrizzleCreditSummaryRepository implements CreditSummaryRepository {
  async latestVersion(applicationId: string) {
    const [latest] = await db
      .select()
      .from(creditSummaries)
      .where(eq(creditSummaries.applicationId, applicationId))
      .orderBy(desc(creditSummaries.version))
      .limit(1);
    return latest?.version ?? 0;
  }

  async saveSummary(input: { applicationId: string; version: number; summaryJson: Record<string, any>; pdfBlobKey: string }) {
    await db.insert(creditSummaries).values({
      applicationId: input.applicationId,
      version: input.version,
      summaryJson: input.summaryJson,
      pdfBlobKey: input.pdfBlobKey,
    });
  }

  async updateApplicationVersion(applicationId: string, version: number) {
    await db
      .update(applications)
      .set({ creditSummaryVersion: version, updatedAt: new Date() })
      .where(eq(applications.id, applicationId));
  }

  async logEvent(applicationId: string, eventType: string, metadata: Record<string, any>, userId?: string) {
    await db.insert(applicationTimelineEvents).values({
      applicationId,
      eventType,
      metadata,
      actorUserId: userId ?? null,
      timestamp: new Date(),
    });
  }
}

export class CreditSummaryEngine {
  private aiEngine: AIEngine;
  private repo: CreditSummaryRepository;

  constructor(
    provider: AIProvider = new EchoAIProvider(),
    repo: CreditSummaryRepository = new DrizzleCreditSummaryRepository(),
    aiEngine?: AIEngine,
  ) {
    this.aiEngine = aiEngine ?? new AIEngine(provider);
    this.repo = repo;
  }

  async generate(payload: CreditSummaryPayload): Promise<CreditSummaryResult> {
    const nextVersion = (await this.repo.latestVersion(payload.applicationId)) + 1;
    const aiResponse = await this.aiEngine.creditSummary({
      applicationId: payload.applicationId,
      userId: payload.userId,
      input: payload.context,
    });

    const summaryJson = this.buildSummaryJson(payload.context, aiResponse.response);
    const pdfBlobKey = this.buildPdfPath(payload.applicationId, nextVersion);

    await this.repo.saveSummary({
      applicationId: payload.applicationId,
      version: nextVersion,
      summaryJson,
      pdfBlobKey,
    });
    await this.repo.updateApplicationVersion(payload.applicationId, nextVersion);
    await this.repo.logEvent(payload.applicationId, "CREDIT_SUMMARY_COMPLETED", { version: nextVersion }, payload.userId);

    return { version: nextVersion, summaryJson, pdfBlobKey };
  }

  private buildSummaryJson(context: Record<string, any>, aiText: string) {
    return {
      businessOverview: context.businessOverview ?? aiText,
      industryOverview: context.industryOverview ?? "",
      keyClients: context.keyClients ?? [],
      financialOverview: context.financialOverview ?? {},
      collateralOverview: context.collateralOverview ?? {},
      riskAssessment: context.riskAssessment ?? "",
      summaryOfTerms: context.summaryOfTerms ?? {},
    };
  }

  private buildPdfPath(applicationId: string, version: number) {
    return `documents/${applicationId}/credit-summary/v${version}/credit-summary.pdf`;
  }
}

export function renderCreditSummaryPdf(summary: Record<string, any>) {
  const content = JSON.stringify(summary, null, 2);
  return Buffer.from(`<pdf>${content}</pdf>`);
}
