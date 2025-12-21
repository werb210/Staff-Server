import { db } from "../db";
import { applicationTimelineEvents, ocrResults } from "../db/schema";
import { OcrProcessor } from "./ocr.processor";
import { buildExtractedJson, mergeConflicts } from "./ocr.extractors";
import { eq } from "drizzle-orm";
export class OcrService {
    processor;
    constructor(processor = new OcrProcessor()) {
        this.processor = processor;
    }
    async process(request) {
        await this.logEvent(request.applicationId, "OCR_REQUESTED", { documentId: request.documentId, documentVersionId: request.documentVersionId }, request.userId);
        const rawText = await this.processor.run(request);
        const extractedJson = buildExtractedJson(rawText);
        const previous = await db
            .select({ extractedJson: ocrResults.extractedJson })
            .from(ocrResults)
            .where(eq(ocrResults.applicationId, request.applicationId));
        const conflicts = mergeConflicts(previous.map((p) => p.extractedJson), extractedJson);
        const categoriesDetected = Object.keys(extractedJson.categories);
        const [record] = await db
            .insert(ocrResults)
            .values({
            applicationId: request.applicationId,
            documentId: request.documentId,
            documentVersionId: request.documentVersionId,
            blobKey: request.blobKey,
            extractedText: { rawText },
            extractedJson,
            categoriesDetected,
            conflictingFields: conflicts,
            status: "completed",
        })
            .returning();
        await this.logEvent(request.applicationId, "OCR_COMPLETED", { documentId: request.documentId, documentVersionId: request.documentVersionId }, request.userId);
        return record;
    }
    async listByApplication(applicationId) {
        const results = await db.select().from(ocrResults).where(eq(ocrResults.applicationId, applicationId));
        return results;
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
