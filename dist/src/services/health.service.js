import { authConfig, config } from "../config/config";
import { isTwilioVerifyConfigured } from "./twilioClient";
export function authHealthCheck() {
    const issues = [];
    if (!authConfig.ACCESS_TOKEN_SECRET)
        issues.push("JWT secret missing");
    const twilioKeysProvided = [
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_AUTH_TOKEN,
        config.TWILIO_VERIFY_SERVICE_SID,
    ].filter(Boolean).length;
    if (twilioKeysProvided > 0 && !isTwilioVerifyConfigured) {
        issues.push("Twilio configuration incomplete");
    }
    return issues.length === 0
        ? { status: "ok" }
        : {
            status: "fail",
            issues,
        };
}
