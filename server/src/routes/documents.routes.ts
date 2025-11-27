import { Router } from "express";
import { documentsController } from "../controllers/documentsController";

const router = Router();

router.get("/", documentsController.list);
router.get("/:id", documentsController.get);
router.post("/", documentsController.create);
router.put("/:id", documentsController.update);
router.delete("/:id", documentsController.delete);

export default router;
