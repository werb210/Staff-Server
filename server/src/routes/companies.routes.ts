// server/src/routes/companies.routes.ts
import { Router } from "express";
import { companiesController } from "../controllers/companiesController.js";

const router = Router();

router.get("/", companiesController.list);
router.get("/:id", companiesController.get);

export default router;
