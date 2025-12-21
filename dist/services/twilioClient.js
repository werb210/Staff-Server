"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasTwilioMessaging = exports.isTwilioVerifyConfigured = exports.twilioClient = void 0;
const twilio_1 = __importDefault(require("twilio"));
const config_1 = require("../config/config");
const hasTwilioCredentials = Boolean(config_1.config.TWILIO_ACCOUNT_SID && config_1.config.TWILIO_AUTH_TOKEN);
exports.twilioClient = hasTwilioCredentials
    ? (0, twilio_1.default)(config_1.config.TWILIO_ACCOUNT_SID, config_1.config.TWILIO_AUTH_TOKEN)
    : null;
exports.isTwilioVerifyConfigured = hasTwilioCredentials && Boolean(config_1.config.TWILIO_VERIFY_SERVICE_SID);
exports.hasTwilioMessaging = hasTwilioCredentials;
