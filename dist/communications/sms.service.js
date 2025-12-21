"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const config_1 = require("../config/config");
const applications_repository_1 = require("../applications/applications.repository");
const timeline_service_1 = require("../applications/timeline.service");
const drizzle_orm_1 = require("drizzle-orm");
const twilioClient_1 = require("../services/twilioClient");
class SmsService {
    database;
    twilioClient;
    timeline;
    constructor(database = db_1.db) {
        this.database = database;
        this.twilioClient = twilioClient_1.twilioClient;
        this.timeline = new timeline_service_1.TimelineService(new applications_repository_1.DrizzleApplicationsRepository(database));
    }
    isConfigured() {
        return Boolean(this.twilioClient && twilioClient_1.hasTwilioMessaging);
    }
    async logCommunication(params) {
        const [created] = await this.database
            .insert(schema_1.communications)
            .values({
            applicationId: params.applicationId,
            type: "sms",
            direction: params.direction,
            body: params.body,
            from: params.from,
            to: params.to,
            metadata: params.metadata ?? {},
            timestamp: new Date(),
        })
            .returning();
        if (params.applicationId) {
            await this.timeline.logEvent(params.applicationId, params.direction === "incoming" ? "SMS_INCOMING" : "SMS_OUTGOING", { communicationId: created.id });
        }
        return created;
    }
    async sendSms(applicationId, to, body, from) {
        if (!this.isConfigured()) {
            throw new Error("Twilio not configured");
        }
        const fromNumber = from || config_1.config.TWILIO_PHONE_NUMBER_BF || config_1.config.TWILIO_PHONE_NUMBER_SLF;
        if (!fromNumber) {
            throw new Error("No Twilio phone number configured");
        }
        await this.twilioClient.messages.create({ to, from: fromNumber, body });
        return this.logCommunication({ applicationId, direction: "outgoing", body, from: fromNumber, to });
    }
    async handleInbound(payload) {
        const applicationId = payload.applicationId ?? null;
        return this.logCommunication({
            applicationId,
            direction: "incoming",
            body: payload.Body,
            from: payload.From,
            to: payload.To,
        });
    }
    async thread(applicationId) {
        return this.database
            .select()
            .from(schema_1.communications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.communications.applicationId, applicationId), (0, drizzle_orm_1.eq)(schema_1.communications.type, "sms")))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.communications.timestamp));
    }
    async listMessages(applicationId) {
        return this.database
            .select()
            .from(schema_1.communications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.communications.applicationId, applicationId), (0, drizzle_orm_1.eq)(schema_1.communications.type, "sms")))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.communications.timestamp));
    }
}
exports.SmsService = SmsService;
