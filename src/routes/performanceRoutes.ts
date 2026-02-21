import { Router } from "express";
import reportingRoutes from "./reporting";

const router = Router();

router.use("/performance", reportingRoutes);

export default router;
