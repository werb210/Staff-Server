import Twilio from "twilio";
import { requireEnv } from "../env.js";
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, } = process.env;
export const twilioConfigured = !!TWILIO_ACCOUNT_SID &&
    !!TWILIO_AUTH_TOKEN &&
    !!TWILIO_VERIFY_SERVICE_SID;
let client = null;
function getTwilioClient() {
    if (client) {
        return client;
    }
    const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
    const authToken = requireEnv("TWILIO_AUTH_TOKEN");
    client = Twilio(accountSid, authToken);
    return client;
}
function getVerifyServiceSid() {
    return requireEnv("TWILIO_VERIFY_SERVICE_SID");
}
export function sendVerificationCode(to) {
    return getTwilioClient()
        .verify.v2.services(getVerifyServiceSid())
        .verifications.create({ to, channel: "sms" });
}
export function checkVerificationCode(to, code) {
    return getTwilioClient()
        .verify.v2.services(getVerifyServiceSid())
        .verificationChecks.create({ to, code });
}
