import { Router } from "express";

import { lenderService } from "../services/lenderService.js";

const router = Router();

router.get("/", (_req, res) => {
  const lenders = lenderService.listLenders();
  res.json({ message: "OK", lenders });
});

export default router;
