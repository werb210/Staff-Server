import { Router } from "express";
import { applicationController } from "../controllers/applicationController.js";

const router = Router();

router.get("/", applicationController.list);
router.get("/:id", applicationController.get);
router.post("/", applicationController.create);
router.put("/:id", applicationController.update);
router.delete("/:id", applicationController.remove);

export default router;
