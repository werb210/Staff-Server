import { applicationTimelineEvents } from "../db/schema";
import { ApplicationsRepository } from "./types";

type TimelineEventType =
  | "application_created"
  | "application_updated"
  | "owner_added"
  | "owner_updated"
  | "owner_removed"
  | "status_changed"
  | "application_assigned"
  | "signature_submitted"
  | "OCR_REQUESTED"
  | "OCR_COMPLETED"
  | "BANKING_ANALYSIS_REQUESTED"
  | "BANKING_ANALYSIS_COMPLETED"
  | "CREDIT_SUMMARY_REQUESTED"
  | "CREDIT_SUMMARY_COMPLETED"
  | "REQUIRED_DOCS_UPDATED"
  | "AI_EVENT_LOGGED";

export class TimelineService {
  constructor(private repo: ApplicationsRepository) {}

  async logEvent(
    applicationId: string,
    eventType: TimelineEventType,
    metadata: Record<string, any> = {},
    actorUserId?: string,
  ) {
    await this.repo.addTimelineEvent({
      applicationId,
      eventType,
      metadata,
      actorUserId: actorUserId ?? null,
      timestamp: new Date(),
    });
  }

  async listEvents(applicationId: string) {
    return this.repo.listTimeline(applicationId);
  }
}

export type TimelineEventRecord = typeof applicationTimelineEvents.$inferSelect;
