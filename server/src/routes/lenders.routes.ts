// server/src/routes/lenders.routes.ts
import { Router } from "express";
import { lendersController } from "../controllers/lendersController.js";

const router = Router();

router.get("/", lendersController.all);
router.get("/:id", lendersController.get);

export default router;
