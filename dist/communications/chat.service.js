"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const applications_repository_1 = require("../applications/applications.repository");
const timeline_service_1 = require("../applications/timeline.service");
class ChatService {
    database;
    timeline;
    constructor(database = db_1.db) {
        this.database = database;
        this.timeline = new timeline_service_1.TimelineService(new applications_repository_1.DrizzleApplicationsRepository(database));
    }
    async sendMessage(params) {
        const [created] = await this.database
            .insert(schema_1.communications)
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
            .from(schema_1.communications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.communications.applicationId, applicationId), (0, drizzle_orm_1.eq)(schema_1.communications.type, "chat")))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.communications.timestamp));
    }
}
exports.ChatService = ChatService;
