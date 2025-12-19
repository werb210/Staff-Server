import { Router } from "express";

import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", (_req, res) => {
  res.json([]);
});

export default router;
