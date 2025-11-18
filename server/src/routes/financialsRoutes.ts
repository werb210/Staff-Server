import { Router } from "express";
import financialsController from "../controllers/financialsController.js";

const router = Router();

router.get("/", financialsController.list);
router.get("/:id", financialsController.get);
router.post("/", financialsController.create);
router.put("/:id", financialsController.update);
router.delete("/:id", financialsController.remove);

export default router;
