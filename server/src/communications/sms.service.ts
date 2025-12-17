import type twilio from "twilio";
import { db } from "../db";
import { communications } from "../db/schema";
import { config } from "../config/config";
import { SmsDirection } from "./communications.types";
import { DrizzleApplicationsRepository } from "../applications/applications.repository";
import { TimelineService } from "../applications/timeline.service";
import { eq, asc, and } from "drizzle-orm";
import { hasTwilioMessaging, twilioClient } from "../services/twilioClient";

export class SmsService {
  private twilioClient: ReturnType<typeof twilio> | null;
  private timeline: TimelineService;

  constructor(private database = db) {
    this.twilioClient = twilioClient;
    this.timeline = new TimelineService(new DrizzleApplicationsRepository(database));
  }

  isConfigured() {
    return Boolean(this.twilioClient && hasTwilioMessaging);
  }

  private async logCommunication(params: {
    applicationId: string | null;
    direction: SmsDirection;
    body: string;
    from: string;
    to: string;
    metadata?: Record<string, any>;
  }) {
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
      await this.timeline.logEvent(
        params.applicationId,
        params.direction === "incoming" ? "SMS_INCOMING" : "SMS_OUTGOING",
        { communicationId: created.id },
      );
    }

    return created;
  }

  async sendSms(applicationId: string | null, to: string, body: string, from?: string) {
    if (!this.isConfigured()) {
      throw new Error("Twilio not configured");
    }
    const fromNumber = from || config.TWILIO_PHONE_NUMBER_BF || config.TWILIO_PHONE_NUMBER_SLF;
    if (!fromNumber) {
      throw new Error("No Twilio phone number configured");
    }

    await this.twilioClient!.messages.create({ to, from: fromNumber, body });

    return this.logCommunication({ applicationId, direction: "outgoing", body, from: fromNumber, to });
  }

  async handleInbound(payload: { From: string; To: string; Body: string; applicationId?: string }) {
    const applicationId = payload.applicationId ?? null;
    return this.logCommunication({
      applicationId,
      direction: "incoming",
      body: payload.Body,
      from: payload.From,
      to: payload.To,
    });
  }

  async thread(applicationId: string) {
    return this.database
      .select()
      .from(communications)
      .where(and(eq(communications.applicationId, applicationId), eq(communications.type, "sms")))
      .orderBy(asc(communications.timestamp));
  }

  async listMessages(applicationId: string) {
    return this.database
      .select()
      .from(communications)
      .where(and(eq(communications.applicationId, applicationId), eq(communications.type, "sms")))
      .orderBy(asc(communications.timestamp));
  }
}
