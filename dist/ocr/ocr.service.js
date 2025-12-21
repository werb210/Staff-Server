"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const ocr_processor_1 = require("./ocr.processor");
const ocr_extractors_1 = require("./ocr.extractors");
const drizzle_orm_1 = require("drizzle-orm");
class OcrService {
    processor;
    constructor(processor = new ocr_processor_1.OcrProcessor()) {
        this.processor = processor;
    }
    async process(request) {
        await this.logEvent(request.applicationId, "OCR_REQUESTED", { documentId: request.documentId, documentVersionId: request.documentVersionId }, request.userId);
        const rawText = await this.processor.run(request);
        const extractedJson = (0, ocr_extractors_1.buildExtractedJson)(rawText);
        const previous = await db_1.db
            .select({ extractedJson: schema_1.ocrResults.extractedJson })
            .from(schema_1.ocrResults)
            .where((0, drizzle_orm_1.eq)(schema_1.ocrResults.applicationId, request.applicationId));
        const conflicts = (0, ocr_extractors_1.mergeConflicts)(previous.map((p) => p.extractedJson), extractedJson);
        const categoriesDetected = Object.keys(extractedJson.categories);
        const [record] = await db_1.db
            .insert(schema_1.ocrResults)
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
        const results = await db_1.db.select().from(schema_1.ocrResults).where((0, drizzle_orm_1.eq)(schema_1.ocrResults.applicationId, applicationId));
        return results;
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
exports.OcrService = OcrService;
