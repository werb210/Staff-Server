import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { applicationTimelineEvents, bankingAnalysis, documentVersions } from "../db/schema";
import { OcrProcessor } from "../ocr/ocr.processor";
import { BankingAnalyzer } from "./banking.analyzer";
export class BankingService {
    processor;
    analyzer;
    constructor(processor = new OcrProcessor(), analyzer = new BankingAnalyzer()) {
        this.processor = processor;
        this.analyzer = analyzer;
    }
    async analyze(request) {
        await this.logEvent(request.applicationId, "BANKING_ANALYSIS_REQUESTED", { documentVersionIds: request.documentVersionIds }, request.userId);
        const versions = await db
            .select({ id: documentVersions.id, blobKey: documentVersions.blobKey })
            .from(documentVersions)
            .where(inArray(documentVersions.id, request.documentVersionIds));
        const allTransactions = [];
        for (const version of versions) {
            const rawText = await this.processor.run({
                applicationId: request.applicationId,
                documentId: "",
                documentVersionId: version.id,
                blobKey: version.blobKey,
            });
            allTransactions.push(...this.analyzer.parseTransactions(rawText));
        }
        const categorized = this.analyzer.categorize(allTransactions);
        const metrics = this.analyzer.computeMetrics(allTransactions);
        const monthlyJson = this.analyzer.monthlyBreakdown(allTransactions);
        const [record] = await db
            .insert(bankingAnalysis)
            .values({
            applicationId: request.applicationId,
            documentVersionId: request.documentVersionIds[0],
            summary: categorized,
            metricsJson: metrics,
            monthlyJson,
            status: "completed",
        })
            .returning();
        await this.logEvent(request.applicationId, "BANKING_ANALYSIS_COMPLETED", { bankingAnalysisId: record.id }, request.userId);
        return record;
    }
    async listByApplication(applicationId) {
        const records = await db.select().from(bankingAnalysis).where(eq(bankingAnalysis.applicationId, applicationId));
        return records;
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
