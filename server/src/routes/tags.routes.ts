import { Router } from "express";
import tagController from "../controllers/tagController";

const router = Router();

router.get("/", tagController.list);
router.get("/stats", tagController.stats);
router.get("/types", tagController.getAllTagTypes);
router.get("/:id", tagController.get);
router.post("/", tagController.create);
router.post("/bulk", tagController.createMany);
router.put("/:id", tagController.update);
router.delete("/:id", tagController.remove);
router.delete("/bulk", tagController.bulkDelete);

export default router;
