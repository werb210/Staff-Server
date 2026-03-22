import { Router } from "express";
import {
  listLenderProductsHandler,
  createLenderProductHandler,
  updateLenderProductHandler,
} from "../controllers/lenderProducts.controller";
import { wrap } from "../utils/handlerWrapper";

const router = Router();

router.get("/", wrap(listLenderProductsHandler));
router.post("/", wrap(createLenderProductHandler));
router.put("/:id", wrap(updateLenderProductHandler));

export default router;
