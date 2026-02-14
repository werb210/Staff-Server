import { Router } from "express";
import { getActiveLenderCount } from "../services/publicService";
import publicApplicationRoutes from "./publicApplication";

const router = Router();

router.get("/lender-count", async (_req, res) => {
  const count = await getActiveLenderCount();
  res.json({ count });
});

router.use(publicApplicationRoutes);

export default router;
