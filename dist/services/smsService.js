"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
const twilio_1 = require("./twilio");
async function sendSMS(to, body) {
    if (process.env.TEST_MODE === "true") {
        console.log("[TEST_MODE] SMS skipped");
        return { success: true };
    }
    const from = process.env.TWILIO_NUMBER || process.env.TWILIO_PHONE;
    if (!from || !to) {
        return;
    }
    const client = (0, twilio_1.getTwilioClient)();
    await client.messages.create({ to, from, body });
}
