import { db } from "./db";
import { applicationTimelineEvents, bankingAnalysis } from "./db/schema";
export class BankingEngine {
    async analyze(request) {
        await this.logEvent(request.applicationId, "BANKING_ANALYSIS_REQUESTED", { documentVersionId: request.documentVersionId }, request.userId);
        const [record] = await db
            .insert(bankingAnalysis)
            .values({
            applicationId: request.applicationId,
            documentVersionId: request.documentVersionId ?? null,
            summary: { deposits: [], flags: [] },
            status: "completed",
        })
            .returning();
        await this.logEvent(request.applicationId, "BANKING_ANALYSIS_COMPLETED", { bankingAnalysisId: record.id }, request.userId);
        return record;
    }
    async logEvent(applicationId, eventType, metadata, actorUserId) {
        await db.insert(applicationTimelineEvents).values({
            applicationId,
            eventType,
            metadata,
            actorUserId: actorUserId ?? null,
            timestamp: new Date(),
        });
    }
}
