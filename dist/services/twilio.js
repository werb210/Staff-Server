"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTwilioClient = getTwilioClient;
exports.getVerifyServiceSid = getVerifyServiceSid;
exports.startVerification = startVerification;
exports.checkVerification = checkVerification;
exports.isTwilioAvailable = isTwilioAvailable;
const node_process_1 = __importDefault(require("node:process"));
const twilio_1 = __importDefault(require("twilio"));
let client = null;
function isConfigured() {
    return !!(node_process_1.default.env.TWILIO_ACCOUNT_SID &&
        node_process_1.default.env.TWILIO_AUTH_TOKEN &&
        node_process_1.default.env.TWILIO_VERIFY_SERVICE_SID);
}
function getClient() {
    if (!isConfigured()) {
        throw new Error("Missing required environment variable");
    }
    if (!client) {
        client = (0, twilio_1.default)(node_process_1.default.env.TWILIO_ACCOUNT_SID, node_process_1.default.env.TWILIO_AUTH_TOKEN);
    }
    return client;
}
function getTwilioClient() {
    return getClient();
}
function getVerifyServiceSid() {
    if (!node_process_1.default.env.TWILIO_VERIFY_SERVICE_SID) {
        throw new Error("Missing required environment variable");
    }
    return node_process_1.default.env.TWILIO_VERIFY_SERVICE_SID;
}
async function startVerification(phone) {
    const twilio = getClient();
    return twilio.verify.v2
        .services(getVerifyServiceSid())
        .verifications.create({
        to: phone,
        channel: "sms",
    });
}
async function checkVerification(phone, code) {
    const twilio = getClient();
    return twilio.verify.v2
        .services(getVerifyServiceSid())
        .verificationChecks.create({
        to: phone,
        code,
    });
}
/**
 * Safe guard for tests / non-Twilio environments
 */
function isTwilioAvailable() {
    return isConfigured();
}
