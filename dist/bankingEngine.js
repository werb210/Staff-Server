"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingEngine = void 0;
const db_1 = require("./db");
const schema_1 = require("./db/schema");
class BankingEngine {
    async analyze(request) {
        await this.logEvent(request.applicationId, "BANKING_ANALYSIS_REQUESTED", { documentVersionId: request.documentVersionId }, request.userId);
        const [record] = await db_1.db
            .insert(schema_1.bankingAnalysis)
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
        await db_1.db.insert(schema_1.applicationTimelineEvents).values({
            applicationId,
            eventType,
            metadata,
            actorUserId: actorUserId ?? null,
            timestamp: new Date(),
        });
    }
}
exports.BankingEngine = BankingEngine;
