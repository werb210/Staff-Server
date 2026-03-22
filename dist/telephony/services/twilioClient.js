"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioVoiceGrantConfig = exports.twilioClient = void 0;
const twilio_1 = __importDefault(require("twilio"));
const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC00000000000000000000000000000000";
const authToken = process.env.TWILIO_AUTH_TOKEN || "test_token";
/*
Twilio must always be constructed with `new`.
This allows the CI test suite to inject TwilioMock
without triggering the "cannot be invoked without new" error.
*/
exports.twilioClient = new twilio_1.default(accountSid, authToken);
exports.twilioVoiceGrantConfig = {
    outgoingApplicationSid: process.env.TWILIO_VOICE_APP_SID,
    incomingAllow: true
};
exports.default = exports.twilioClient;
