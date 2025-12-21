import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { OcrService } from "./ocr.service";
import { OcrReprocessSchema } from "./ocr.validators";
export function createOcrRouter(service = new OcrService()) {
    const router = Router();
    router.use(requireAuth);
    router.post("/:documentId/reprocess", async (req, res, next) => {
        try {
            const parsed = OcrReprocessSchema.parse({
                ...req.body,
                documentId: req.params.documentId,
            });
            const result = await service.process({ ...parsed, userId: req.user?.id });
            res.status(201).json(result);
        }
        catch (err) {
            if (err instanceof ZodError) {
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
export default createOcrRouter();
