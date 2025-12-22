import { db } from "../db";
import { communications } from "../db/schema";
import { config } from "../config/config";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";
import { eq, asc, and } from "drizzle-orm";
import { hasTwilioMessaging, twilioClient } from "../services/twilioClient.js";
export class SmsService {
    database;
    twilioClient;
    timeline;
    constructor(database = db) {
        this.database = database;
        this.twilioClient = twilioClient;
        this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
    }
    isConfigured() {
        return Boolean(this.twilioClient && hasTwilioMessaging);
    }
    async logCommunication(params) {
        const [created] = await this.database
            .insert(communications)
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
        const fromNumber = from || config.TWILIO_PHONE_NUMBER_BF || config.TWILIO_PHONE_NUMBER_SLF;
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
            .from(communications)
            .where(and(eq(communications.applicationId, applicationId), eq(communications.type, "sms")))
            .orderBy(asc(communications.timestamp));
    }
    async listMessages(applicationId) {
        return this.database
            .select()
            .from(communications)
            .where(and(eq(communications.applicationId, applicationId), eq(communications.type, "sms")))
            .orderBy(asc(communications.timestamp));
    }
}
