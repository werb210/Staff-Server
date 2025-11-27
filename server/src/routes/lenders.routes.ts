import { Router } from "express";
import { lendersController } from "../controllers/lendersController";

const router = Router();

router.get("/", lendersController.list);
router.get("/:id", lendersController.get);
router.post("/", lendersController.create);
router.put("/:id", lendersController.update);
router.delete("/:id", lendersController.remove);

export default router;
