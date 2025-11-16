import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  listLenders,
  createLender,
  updateLender,
  deleteLender,
  getLenderProducts,
  createLenderProduct
} from "../controllers/lendersController.js";

const router = Router({ mergeParams: true });

/**
 * All lender routes require authentication
 */
router.use(requireAuth);

/**
 * Lender CRUD
 */
router.get("/", listLenders);
router.post("/", createLender);
router.put("/:lenderId", updateLender);
router.delete("/:lenderId", deleteLender);

/**
 * Lender Products
 */
router.get("/:lenderId/products", getLenderProducts);
router.post("/:lenderId/products", createLenderProduct);

export default router;
