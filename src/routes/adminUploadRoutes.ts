import { Router } from "express";
import adminExportsRoutes from "./admin.exports";

const router = Router();

router.use("/upload", adminExportsRoutes);
router.use("/outbound", adminExportsRoutes);

export default router;
