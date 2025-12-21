import { asc, and, eq } from "drizzle-orm";
import { db } from "../db";
import { communications } from "../db/schema";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";
export class ChatService {
    database;
    timeline;
    constructor(database = db) {
        this.database = database;
        this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
    }
    async sendMessage(params) {
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
    async thread(applicationId) {
        return this.database
            .select()
            .from(communications)
            .where(and(eq(communications.applicationId, applicationId), eq(communications.type, "chat")))
            .orderBy(asc(communications.timestamp));
    }
}
