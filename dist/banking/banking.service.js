"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const ocr_processor_1 = require("../ocr/ocr.processor");
const banking_analyzer_1 = require("./banking.analyzer");
class BankingService {
    processor;
    analyzer;
    constructor(processor = new ocr_processor_1.OcrProcessor(), analyzer = new banking_analyzer_1.BankingAnalyzer()) {
        this.processor = processor;
        this.analyzer = analyzer;
    }
    async analyze(request) {
        await this.logEvent(request.applicationId, "BANKING_ANALYSIS_REQUESTED", { documentVersionIds: request.documentVersionIds }, request.userId);
        const versions = await db_1.db
            .select({ id: schema_1.documentVersions.id, blobKey: schema_1.documentVersions.blobKey })
            .from(schema_1.documentVersions)
            .where((0, drizzle_orm_1.inArray)(schema_1.documentVersions.id, request.documentVersionIds));
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
        const [record] = await db_1.db
            .insert(schema_1.bankingAnalysis)
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
        const records = await db_1.db.select().from(schema_1.bankingAnalysis).where((0, drizzle_orm_1.eq)(schema_1.bankingAnalysis.applicationId, applicationId));
        return records;
    }
    async logEvent(applicationId, eventType, metadata, actorUserId) {
        await db_1.db.insert(schema_1.applicationTimelineEvents).values({
            applicationId,
            eventType,
            metadata,
            actorUserId: actorUserId ?? null,
            timestamp: new Date(),
        });
    }
}
exports.BankingService = BankingService;
