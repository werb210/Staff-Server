import { Router } from "express";
import { lenderProductService } from "../../services/lenderProductService.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ data: lenderProductService.listProducts() });
});

export default router;
