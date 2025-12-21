import { config } from "../config/config";
import { OTP_ENABLED } from "./otpToggle";
let client = null;
if (OTP_ENABLED) {
    const twilio = require("twilio");
    client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
}
class TwilioVerifyService {
    client = client;
    verifyServiceSid = config.TWILIO_VERIFY_SERVICE_SID;
    isEnabled() {
        return OTP_ENABLED && Boolean(this.client && this.verifyServiceSid);
    }
    ensureConfigured() {
        if (!OTP_ENABLED) {
            throw new Error("Twilio not configured");
        }
        if (!this.client || !this.verifyServiceSid) {
            throw new Error("Twilio not initialized");
        }
    }
    async startVerification(email) {
        if (!OTP_ENABLED)
            return;
        this.ensureConfigured();
        if (!email) {
            throw new Error("Verification target is required");
        }
        await this.client.verify.v2
            .services(this.verifyServiceSid)
            .verifications.create({ to: email, channel: "email" });
    }
    async verifyCode(email, code) {
        if (!OTP_ENABLED)
            return true;
        this.ensureConfigured();
        if (!code || code.trim().length === 0) {
            throw new Error("Verification code is required");
        }
        const result = await this.client.verify.v2
            .services(this.verifyServiceSid)
            .verificationChecks.create({ to: email, code });
        if (result.status !== "approved") {
            throw new Error("Two-factor verification failed");
        }
        return true;
    }
}
export const twilioVerifyService = new TwilioVerifyService();
