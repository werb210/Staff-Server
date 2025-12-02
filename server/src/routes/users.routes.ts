import { Router } from "express";
import usersController from "../controllers/usersController.js";

const router = Router();

router.get("/", usersController.list);
router.get("/:id", usersController.getOne);
router.post("/", usersController.create);
router.put("/:id", usersController.update);
router.delete("/:id", usersController.remove);

export default router;
