"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiEngine_1 = require("../ai/aiEngine");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
const aiEngine = new aiEngine_1.AIEngine(new aiEngine_1.EchoAIProvider());
router.use(requireAuth_1.requireAuth);
router.post("/summarize", async (req, res, next) => {
    try {
        const result = await aiEngine.summarize({
            applicationId: req.body.applicationId,
            userId: req.user?.id,
            input: req.body.input ?? { content: req.body.content ?? "" },
            documentVersionId: req.body.documentVersionId,
            template: req.body.template,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post("/extract", async (req, res, next) => {
    try {
        const result = await aiEngine.extract({
            applicationId: req.body.applicationId,
            userId: req.user?.id,
            input: req.body.input ?? { content: req.body.content ?? "" },
            documentVersionId: req.body.documentVersionId,
            template: req.body.template,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post("/rewrite", async (req, res, next) => {
    try {
        const result = await aiEngine.rewrite({
            applicationId: req.body.applicationId,
            userId: req.user?.id,
            input: req.body.input ?? { content: req.body.content ?? "" },
            documentVersionId: req.body.documentVersionId,
            template: req.body.template,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post("/credit-summary", async (req, res, next) => {
    try {
        const result = await aiEngine.creditSummary({
            applicationId: req.body.applicationId,
            userId: req.user?.id,
            input: req.body.input ?? {},
            template: req.body.template,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
