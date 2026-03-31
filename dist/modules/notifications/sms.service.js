"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
const twilio_1 = require("../../services/twilio");
const config_1 = require("../../config");
const retry_1 = require("../../lib/retry");
const deadLetter_1 = require("../../lib/deadLetter");
async function sendSms({ to, message }) {
    if (config_1.config.app.testMode === "true") {
        console.log("[TEST_MODE] SMS skipped");
        return { success: true };
    }
    const client = (0, twilio_1.fetchTwilioClient)();
    const payload = {
        body: message,
        from: config_1.config.twilio.from || config_1.config.twilio.number || config_1.config.twilio.phone,
        to,
    };
    try {
        return await (0, retry_1.withRetry)(() => client.messages.create(payload));
    }
    catch (error) {
        await (0, deadLetter_1.pushDeadLetter)({
            type: "sms",
            data: payload,
            error: String(error),
        });
        throw error;
    }
}
