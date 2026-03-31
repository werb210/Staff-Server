"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
const twilio_1 = require("./twilio");
const config_1 = require("../config");
const retry_1 = require("../lib/retry");
const deadLetter_1 = require("../lib/deadLetter");
async function sendSMS(to, body) {
    if (config_1.config.app.testMode === "true") {
        console.log("[TEST_MODE] SMS skipped");
        return { success: true };
    }
    const from = config_1.config.twilio.number || config_1.config.twilio.phone;
    if (!from || !to) {
        return;
    }
    const client = (0, twilio_1.fetchTwilioClient)();
    try {
        await (0, retry_1.withRetry)(() => client.messages.create({ to, from, body }));
    }
    catch (error) {
        await (0, deadLetter_1.pushDeadLetter)({
            type: "sms",
            data: { to, from, body },
            error: String(error),
        });
        throw error;
    }
}
