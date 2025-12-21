"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHealthCheck = authHealthCheck;
const config_1 = require("../config/config");
const twilioClient_1 = require("./twilioClient");
function authHealthCheck() {
    const issues = [];
    if (!config_1.authConfig.ACCESS_TOKEN_SECRET)
        issues.push("ACCESS_TOKEN_SECRET missing");
    if (!config_1.config.JWT_SECRET)
        issues.push("JWT_SECRET missing");
    const twilioKeysProvided = [
        config_1.config.TWILIO_ACCOUNT_SID,
        config_1.config.TWILIO_AUTH_TOKEN,
        config_1.config.TWILIO_VERIFY_SERVICE_SID,
    ].filter(Boolean).length;
    if (twilioKeysProvided > 0 && !twilioClient_1.isTwilioVerifyConfigured) {
        issues.push("Twilio configuration incomplete");
    }
    return issues.length === 0
        ? { status: "ok" }
        : {
            status: "fail",
            issues,
        };
}
