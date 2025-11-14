import { Router } from "express";
import {
  fetchLenders,
  fetchLenderProducts,
} from "../controllers/lenders/lenderController.js";

const router = Router();

// /lenders/silo/BF
router.get("/silo/:silo", fetchLenders);

// /lenders/silo/BF/products
router.get("/silo/:silo/products", fetchLenderProducts);

export default router;
