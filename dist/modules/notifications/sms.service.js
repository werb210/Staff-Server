"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
const twilio_1 = require("../../services/twilio");
async function sendSms({ to, message }) {
    if (process.env.TEST_MODE === "true") {
        console.log("[TEST_MODE] SMS skipped");
        return { success: true };
    }
    const client = (0, twilio_1.getTwilioClient)();
    return client.messages.create({
        body: message,
        from: process.env.TWILIO_FROM || process.env.TWILIO_NUMBER || process.env.TWILIO_PHONE,
        to,
    });
}
