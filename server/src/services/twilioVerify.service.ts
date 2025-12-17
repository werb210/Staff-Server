import { config } from "../config/config";
import { isTwilioVerifyConfigured, twilioClient } from "./twilioClient";

class TwilioVerifyService {
  private client = twilioClient;
  private verifyServiceSid = config.TWILIO_VERIFY_SERVICE_SID;

  isEnabled() {
    return Boolean(this.client && this.verifyServiceSid && isTwilioVerifyConfigured);
  }

  private ensureConfigured() {
    if (!this.isEnabled()) {
      throw new Error("Twilio not configured");
    }
  }

  async startVerification(email: string) {
    this.ensureConfigured();
    if (!email) {
      throw new Error("Verification target is required");
    }

    await this.client!.verify.v2
      .services(this.verifyServiceSid as string)
      .verifications.create({ to: email, channel: "email" });
  }

  async verifyCode(email: string, code: string) {
    this.ensureConfigured();
    if (!code || code.trim().length === 0) {
      throw new Error("Verification code is required");
    }

    const result = await this.client!.verify.v2
      .services(this.verifyServiceSid as string)
      .verificationChecks.create({ to: email, code });

    if (result.status !== "approved") {
      throw new Error("Two-factor verification failed");
    }
  }
}

export const twilioVerifyService = new TwilioVerifyService();
