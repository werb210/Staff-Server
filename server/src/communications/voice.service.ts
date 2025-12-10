import { db } from "../db/client";
import { communications } from "../db/schema";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";

export class VoiceService {
  private timeline: TimelineService;

  constructor(private database = db) {
    this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
  }

  async logEvent(params: {
    applicationId: string;
    phoneNumber: string;
    eventType: "CALL_STARTED" | "CALL_ENDED" | "CALL_MISSED";
    durationSeconds?: number;
  }) {
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
