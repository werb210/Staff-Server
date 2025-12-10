import { Router } from "express";
import { BankingEngine } from "../bankingEngine";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const engine = new BankingEngine();

router.use(requireAuth);

router.post("/analyze", async (req, res, next) => {
  try {
    const record = await engine.analyze({
      applicationId: req.body.applicationId,
      documentVersionId: req.body.documentVersionId,
      userId: req.user?.id,
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
