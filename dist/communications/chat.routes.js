"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const communications_validators_1 = require("./communications.validators");
const chat_service_1 = require("./chat.service");
const requireAuth_1 = require("../middleware/requireAuth");
const errors_1 = require("../errors");
const router = (0, express_1.Router)();
const chatService = new chat_service_1.ChatService();
router.use(requireAuth_1.requireAuth);
router.post("/send", async (req, res, next) => {
    try {
        const payload = communications_validators_1.chatSendSchema.parse(req.body);
        if (!payload.applicationId || !payload.body || !payload.direction) {
            throw new errors_1.BadRequest("invalid chat payload");
        }
        const record = await chatService.sendMessage({
            applicationId: payload.applicationId,
            direction: payload.direction,
            body: payload.body,
            issueReport: payload.issueReport ?? false,
        });
        res.json({ ok: true, record });
    }
    catch (err) {
        next(err);
    }
});
router.get("/thread/:applicationId", async (req, res, next) => {
    try {
        const { applicationId } = req.params;
        const records = await chatService.thread(applicationId);
        res.json({ ok: true, records });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
