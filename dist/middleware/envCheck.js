"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = envCheck;
const logger_1 = require("../server/utils/logger");
function envCheck(_req, res, next) {
    if (process.env.NODE_ENV === "test") {
        next();
        return;
    }
    const required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        logger_1.logger.error("env_missing", { missing });
        res.status(500).json({ success: false, error: `env_missing: ${missing.join(",")}` });
        return;
    }
    next();
}
