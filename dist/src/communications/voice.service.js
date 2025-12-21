import { db } from "../db";
import { communications } from "../db/schema";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";
export class VoiceService {
    database;
    timeline;
    constructor(database = db) {
        this.database = database;
        this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
    }
    async logEvent(params) {
        const [record] = await this.database
            .insert(communications)
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
