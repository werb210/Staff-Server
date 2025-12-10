import { Router } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { BankingService } from "./banking.service";
import { BankingReprocessSchema } from "./banking.types";

export function createBankingRouter(service = new BankingService()) {
  const router = Router();
  router.use(requireAuth);

  router.post("/:applicationId/reprocess", async (req, res, next) => {
    try {
      const parsed = BankingReprocessSchema.parse({
        ...req.body,
        applicationId: req.params.applicationId,
      });
      const record = await service.analyze({ ...parsed, userId: req.user?.id });
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  router.get("/:applicationId/summary", async (req, res, next) => {
    try {
      const analyses = await service.listByApplication(req.params.applicationId);
      res.json({ applicationId: req.params.applicationId, analyses });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createBankingRouter();
