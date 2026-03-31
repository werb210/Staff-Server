"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushLeadToCRM = pushLeadToCRM;
const config_1 = require("../config");
const deadLetter_1 = require("../lib/deadLetter");
const retry_1 = require("../lib/retry");
async function pushLeadToCRM(data) {
    if (!config_1.config.crm.webhookUrl) {
        return;
    }
    try {
        await (0, retry_1.withRetry)(async () => {
            const response = await fetch(config_1.config.crm.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`crm_webhook_failed:${response.status}:${await response.text()}`);
            }
        });
    }
    catch (error) {
        await (0, deadLetter_1.pushDeadLetter)({
            type: "partner_webhook",
            data,
            error: String(error),
        });
        throw error;
    }
}
