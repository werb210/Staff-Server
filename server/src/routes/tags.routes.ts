import { Router } from "express";
import tagController from "../controllers/tagController.js";

const router = Router();

router.get("/", tagController.list);
router.post("/", tagController.create);
router.put("/:id", tagController.update);
router.delete("/:id", tagController.remove);

export default router;
