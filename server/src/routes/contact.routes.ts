import { Router } from "express";
import { contactController } from "../controllers/contactController.js";

const router = Router();

router.get("/", contactController.list);
router.get("/:id", contactController.get);
router.post("/", contactController.create);
router.put("/:id", contactController.update);
router.delete("/:id", contactController.remove);

export default router;
