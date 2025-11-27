import { Router } from "express";
import { dealsController } from "../controllers/dealsController.js";

const router = Router();

router.get("/", dealsController.list);
router.get("/:id", dealsController.get);
router.post("/", dealsController.create);
router.put("/:id", dealsController.update);
router.delete("/:id", dealsController.remove);

export default router;
