"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditSummaryEngine = void 0;
exports.renderCreditSummaryPdf = renderCreditSummaryPdf;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const aiEngine_1 = require("./aiEngine");
class DrizzleCreditSummaryRepository {
    async latestVersion(applicationId) {
        const [latest] = await db_1.db
            .select()
            .from(schema_1.creditSummaries)
            .where((0, drizzle_orm_1.eq)(schema_1.creditSummaries.applicationId, applicationId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.creditSummaries.version))
            .limit(1);
        return latest?.version ?? 0;
    }
    async saveSummary(input) {
        await db_1.db.insert(schema_1.creditSummaries).values({
            applicationId: input.applicationId,
            version: input.version,
            summaryJson: input.summaryJson,
            pdfBlobKey: input.pdfBlobKey,
        });
    }
    async updateApplicationVersion(applicationId, version) {
        await db_1.db
            .update(schema_1.applications)
            .set({ creditSummaryVersion: version, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.applications.id, applicationId));
    }
    async logEvent(applicationId, eventType, metadata, userId) {
        await db_1.db.insert(schema_1.applicationTimelineEvents).values({
            applicationId,
            eventType,
            metadata,
            actorUserId: userId ?? null,
            timestamp: new Date(),
        });
    }
}
class CreditSummaryEngine {
    aiEngine;
    repo;
    constructor(provider = new aiEngine_1.EchoAIProvider(), repo = new DrizzleCreditSummaryRepository(), aiEngine) {
        this.aiEngine = aiEngine ?? new aiEngine_1.AIEngine(provider);
        this.repo = repo;
    }
    async generate(payload) {
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
    buildSummaryJson(context, aiText) {
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
    buildPdfPath(applicationId, version) {
        return `documents/${applicationId}/credit-summary/v${version}/credit-summary.pdf`;
    }
}
exports.CreditSummaryEngine = CreditSummaryEngine;
function renderCreditSummaryPdf(summary) {
    const content = JSON.stringify(summary, null, 2);
    return Buffer.from(`<pdf>${content}</pdf>`);
}
