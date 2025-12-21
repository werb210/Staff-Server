"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCREngine = void 0;
const db_1 = require("./db");
const schema_1 = require("./db/schema");
class OCREngine {
    async processDocument(request) {
        await this.logEvent(request.applicationId, "OCR_REQUESTED", { documentVersionId: request.documentVersionId }, request.userId);
        const result = await db_1.db
            .insert(schema_1.ocrResults)
            .values({
            applicationId: request.applicationId,
            documentId: request.documentId,
            documentVersionId: request.documentVersionId,
            blobKey: request.blobKey,
            extractedText: { content: "Stub OCR result" },
            status: "completed",
        })
            .returning();
        await this.logEvent(request.applicationId, "OCR_COMPLETED", { documentVersionId: request.documentVersionId }, request.userId);
        return result[0];
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
exports.OCREngine = OCREngine;
