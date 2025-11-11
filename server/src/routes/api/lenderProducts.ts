import { Router } from "express";

import { lenderProductService } from "../../services/lenderProductService.js";

const router = Router();

router.get("/", (_req, res) => {
  const products = lenderProductService.listProducts();
  res.json({ message: "OK", products });
});

router.post("/", (req, res, next) => {
  try {
    const product = lenderProductService.addProduct(req.body);
    res.status(201).json({ message: "OK", product });
  } catch (error) {
    next(error);
  }
});

export default router;
