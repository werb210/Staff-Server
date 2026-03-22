"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushLeadToCRM = pushLeadToCRM;
async function pushLeadToCRM(data) {
    if (!process.env.CRM_WEBHOOK_URL) {
        return;
    }
    await fetch(process.env.CRM_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}
