import { Router } from "express";
import { notificationsController } from "../controllers/notificationsController";

const router = Router();

router.get("/", notificationsController.list);
router.get("/:id", notificationsController.get);
router.post("/", notificationsController.create);
router.put("/:id", notificationsController.update);
router.delete("/:id", notificationsController.remove);

export default router;
