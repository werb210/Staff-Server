import { Router } from "express";
import mayaInternalRoutes from "./mayaInternal";

const router = Router();

router.use("/enterprise", mayaInternalRoutes);

export default router;
