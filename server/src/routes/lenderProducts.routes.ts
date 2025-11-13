// server/src/routes/lenderProducts.routes.ts
import { Router } from "express";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/lenderProductController.js";

const router = Router();

// GET /api/lender-products
router.get("/", listProducts);

// POST /api/lender-products
router.post("/", createProduct);

// PUT /api/lender-products/:id
router.put("/:id", updateProduct);

// DELETE /api/lender-products/:id
router.delete("/:id", deleteProduct);

export default router;
