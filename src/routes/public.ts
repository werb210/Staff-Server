import { Router } from "express";
import { getActiveLenderCount } from "../services/publicService";

const router = Router();

router.get("/lender-count", async (_req, res) => {
  const count = await getActiveLenderCount();
  res.json({ count });
});

export default router;
