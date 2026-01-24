import { Router } from "express";
import clientSubmissionRoutes from "../modules/clientSubmission/clientSubmission.routes";
import lenderProductsRoutes from "./client/lenderProducts";

const router = Router();

router.use("/lender-products", lenderProductsRoutes);
router.use("/", clientSubmissionRoutes);

export default router;
