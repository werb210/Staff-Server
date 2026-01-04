import { Router } from "express";
import lenderRoutes from "../modules/lender/lender.routes";

const router = Router();
router.use("/", lenderRoutes);

export default router;
