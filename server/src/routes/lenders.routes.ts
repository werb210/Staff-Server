import { Router } from "express";
import {
  listLenders,
  createLender,
  updateLender,
  deleteLender,
} from "../controllers/lenderController.js";
import {
  getLenderProducts,
  createLenderProduct,
} from "../controllers/lendersController.js";

const router = Router();

router.get("/:silo", listLenders);
router.post("/:silo", createLender);
router.put("/:silo/:lenderId", updateLender);
router.delete("/:silo/:lenderId", deleteLender);
router.get("/:silo/:lenderId/products", getLenderProducts);
router.post("/:silo/:lenderId/products", createLenderProduct);

export default router;
