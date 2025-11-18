import { Router } from "express";
import { companyController } from "../controllers/companyController.js";

const router = Router();

router.get("/", companyController.list);
router.get("/:id", companyController.get);
router.post("/", companyController.create);
router.put("/:id", companyController.update);
router.delete("/:id", companyController.remove);

export default router;
