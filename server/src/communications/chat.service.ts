import { asc, and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { communications } from "../db/schema";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";

export class ChatService {
  private timeline: TimelineService;

  constructor(private database = db) {
    this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
  }

  async sendMessage(params: {
    applicationId: string;
    direction: "client" | "staff";
    body: string;
    issueReport?: boolean;
  }) {
    const [created] = await this.database
      .insert(communications)
      .values({
        applicationId: params.applicationId,
        type: "chat",
        direction: params.direction,
        body: params.body,
        from: params.direction,
        to: params.direction === "client" ? "staff" : "client",
        metadata: { issueReport: params.issueReport ?? false },
        timestamp: new Date(),
      })
      .returning();

    const eventType = params.issueReport
      ? "REPORT_ISSUE_RECEIVED"
      : params.direction === "staff"
        ? "STAFF_MESSAGE_SENT"
        : "CHAT_MESSAGE";

    await this.timeline.logEvent(params.applicationId, eventType, { communicationId: created.id });

    return created;
  }

  async thread(applicationId: string) {
    return this.database
      .select()
      .from(communications)
      .where(and(eq(communications.applicationId, applicationId), eq(communications.type, "chat")))
      .orderBy(asc(communications.timestamp));
  }
}
