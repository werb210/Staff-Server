import { Router } from "express";
import lenderSubmissionsRoutes from "../modules/lenderSubmissions/lenderSubmissions.routes";

const router = Router();

router.use("/", lenderSubmissionsRoutes);

export default router;
