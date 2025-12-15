import { db } from "./db";
import { applicationTimelineEvents, bankingAnalysis } from "./db/schema";

export interface BankingAnalysisRequest {
  applicationId: string;
  documentVersionId?: string;
  userId?: string;
}

export class BankingEngine {
  async analyze(request: BankingAnalysisRequest) {
    await this.logEvent(
      request.applicationId,
      "BANKING_ANALYSIS_REQUESTED",
      { documentVersionId: request.documentVersionId },
      request.userId,
    );

    const [record] = await db
      .insert(bankingAnalysis)
      .values({
        applicationId: request.applicationId,
        documentVersionId: request.documentVersionId ?? null,
        summary: { deposits: [], flags: [] },
        status: "completed",
      })
      .returning();

    await this.logEvent(
      request.applicationId,
      "BANKING_ANALYSIS_COMPLETED",
      { bankingAnalysisId: record.id },
      request.userId,
    );

    return record;
  }

  private async logEvent(applicationId: string, eventType: string, metadata: Record<string, any>, actorUserId?: string) {
    await db.insert(applicationTimelineEvents).values({
      applicationId,
      eventType,
      metadata,
      actorUserId: actorUserId ?? null,
      timestamp: new Date(),
    });
  }
}
