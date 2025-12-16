import twilio from "twilio";
import { config } from "../config/config";

class TwilioVerifyService {
  private client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  private verifyServiceSid = config.TWILIO_VERIFY_SERVICE_SID;

  async startVerification(email: string) {
    if (!email) {
      throw new Error("Verification target is required");
    }

    await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({ to: email, channel: "email" });
  }

  async verifyCode(email: string, code: string) {
    if (!code || code.trim().length === 0) {
      throw new Error("Verification code is required");
    }

    const result = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({ to: email, code });

    if (result.status !== "approved") {
      throw new Error("Two-factor verification failed");
    }
  }
}

export const twilioVerifyService = new TwilioVerifyService();
