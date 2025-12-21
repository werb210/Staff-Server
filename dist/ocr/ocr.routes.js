"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOcrRouter = createOcrRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const ocr_service_1 = require("./ocr.service");
const ocr_validators_1 = require("./ocr.validators");
function createOcrRouter(service = new ocr_service_1.OcrService()) {
    const router = (0, express_1.Router)();
    router.use(requireAuth_1.requireAuth);
    router.post("/:documentId/reprocess", async (req, res, next) => {
        try {
            const parsed = ocr_validators_1.OcrReprocessSchema.parse({
                ...req.body,
                documentId: req.params.documentId,
            });
            const result = await service.process({ ...parsed, userId: req.user?.id });
            res.status(201).json(result);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json({ error: err.message });
            }
            next(err);
        }
    });
    router.get("/:applicationId/results", async (req, res, next) => {
        try {
            const results = await service.listByApplication(req.params.applicationId);
            res.json({ applicationId: req.params.applicationId, results });
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
exports.default = createOcrRouter();
