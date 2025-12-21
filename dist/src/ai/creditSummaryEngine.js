import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { applications, applicationTimelineEvents, creditSummaries } from "../db/schema";
import { AIEngine, EchoAIProvider } from "./aiEngine";
class DrizzleCreditSummaryRepository {
    async latestVersion(applicationId) {
        const [latest] = await db
            .select()
            .from(creditSummaries)
            .where(eq(creditSummaries.applicationId, applicationId))
            .orderBy(desc(creditSummaries.version))
            .limit(1);
        return latest?.version ?? 0;
    }
    async saveSummary(input) {
        await db.insert(creditSummaries).values({
            applicationId: input.applicationId,
            version: input.version,
            summaryJson: input.summaryJson,
            pdfBlobKey: input.pdfBlobKey,
        });
    }
    async updateApplicationVersion(applicationId, version) {
        await db
            .update(applications)
            .set({ creditSummaryVersion: version, updatedAt: new Date() })
            .where(eq(applications.id, applicationId));
    }
    async logEvent(applicationId, eventType, metadata, userId) {
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
    aiEngine;
    repo;
    constructor(provider = new EchoAIProvider(), repo = new DrizzleCreditSummaryRepository(), aiEngine) {
        this.aiEngine = aiEngine ?? new AIEngine(provider);
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
export function renderCreditSummaryPdf(summary) {
    const content = JSON.stringify(summary, null, 2);
    return Buffer.from(`<pdf>${content}</pdf>`);
}
