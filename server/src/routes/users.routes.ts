import { Router } from "express";
import { usersController } from "../controllers/usersController";

const router = Router();

router.get("/", usersController.list);
router.get("/:id", usersController.get);
router.post("/", usersController.create);
router.put("/:id", usersController.update);
router.delete("/:id", usersController.delete);

export default router;
