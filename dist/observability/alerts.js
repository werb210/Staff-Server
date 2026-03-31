"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSlackAlert = sendSlackAlert;
const config_1 = require("../config");
const logger_1 = require("../platform/logger");
const deadLetter_1 = require("../lib/deadLetter");
const retry_1 = require("../lib/retry");
async function sendSlackAlert(message) {
    const webhookUrl = config_1.config.alerting.slackWebhookUrl;
    if (!webhookUrl) {
        logger_1.logger.warn("slack_alert_not_configured");
        return;
    }
    try {
        await (0, retry_1.withRetry)(async () => {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ text: `[BF-Server] ${message}` }),
            });
            if (!response.ok) {
                const responseBody = await response.text();
                throw new Error(`slack_alert_delivery_failed:${response.status}:${responseBody}`);
            }
        });
    }
    catch (error) {
        await (0, deadLetter_1.pushDeadLetter)({
            type: "slack_webhook",
            data: { message },
            error: String(error),
        });
        logger_1.logger.error("slack_alert_delivery_failed", { error: String(error) });
    }
}
