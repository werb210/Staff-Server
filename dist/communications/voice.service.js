"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const applications_repository_1 = require("../applications/applications.repository");
const timeline_service_1 = require("../applications/timeline.service");
class VoiceService {
    database;
    timeline;
    constructor(database = db_1.db) {
        this.database = database;
        this.timeline = new timeline_service_1.TimelineService(new applications_repository_1.DrizzleApplicationsRepository(database));
    }
    async logEvent(params) {
        const [record] = await this.database
            .insert(schema_1.communications)
            .values({
            applicationId: params.applicationId,
            type: "voice",
            direction: "event",
            body: params.eventType,
            from: params.phoneNumber,
            to: params.phoneNumber,
            metadata: { durationSeconds: params.durationSeconds },
            timestamp: new Date(),
        })
            .returning();
        await this.timeline.logEvent(params.applicationId, params.eventType, {
            communicationId: record.id,
            phoneNumber: params.phoneNumber,
            durationSeconds: params.durationSeconds,
        });
        return record;
    }
}
exports.VoiceService = VoiceService;
