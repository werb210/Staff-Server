import { Router } from "express";
import searchController from "../controllers/searchController.js";

const router = Router();

router.get("/", searchController.globalSearch);
router.get("/recent", searchController.recent);
router.get("/suggest", searchController.suggest);

export default router;
