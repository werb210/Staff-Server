import { Router } from "express";
import clientSubmissionRoutes from "../modules/clientSubmission/clientSubmission.routes";
import clientLendersRoutes from "./client/lenders";
import lenderProductsRoutes from "./client/lenderProducts";

const router = Router();

router.use("/lenders", clientLendersRoutes);
router.use("/lender-products", lenderProductsRoutes);
router.use("/", clientSubmissionRoutes);

export default router;
