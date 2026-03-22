"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
const twilio_1 = __importDefault(require("twilio"));
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE;
if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio not configured");
}
const client = (0, twilio_1.default)(accountSid, authToken);
async function sendSMS(to, body) {
    if (!accountSid || !authToken || !fromNumber) {
        console.log("Skipping SMS (Twilio not configured)", { to, body });
        return;
    }
    return client.messages.create({
        body,
        from: fromNumber,
        to,
    });
}
