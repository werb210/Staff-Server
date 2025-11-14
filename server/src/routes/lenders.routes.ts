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

const router = Router({ mergeParams: true });

router.get("/", listLenders);
router.post("/", createLender);
router.put("/:lenderId", updateLender);
router.delete("/:lenderId", deleteLender);
router.get("/:lenderId/products", getLenderProducts);
router.post("/:lenderId/products", createLenderProduct);

export default router;
