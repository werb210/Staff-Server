"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBankingRouter = createBankingRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const banking_service_1 = require("./banking.service");
const banking_types_1 = require("./banking.types");
function createBankingRouter(service = new banking_service_1.BankingService()) {
    const router = (0, express_1.Router)();
    router.use(requireAuth_1.requireAuth);
    router.post("/:applicationId/reprocess", async (req, res, next) => {
        try {
            const parsed = banking_types_1.BankingReprocessSchema.parse({
                ...req.body,
                applicationId: req.params.applicationId,
            });
            const record = await service.analyze({ ...parsed, userId: req.user?.id });
            res.status(201).json(record);
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json({ error: err.message });
            }
            next(err);
        }
    });
    router.get("/:applicationId/summary", async (req, res, next) => {
        try {
            const analyses = await service.listByApplication(req.params.applicationId);
            res.json({ applicationId: req.params.applicationId, analyses });
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
exports.default = createBankingRouter();
